import { Clock, Crown, Zap } from "lucide-react";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { EmptyState, PageHeader, StatusChip } from "@/components/ui";
import { formatEta } from "@/lib/boosting/engine";
import { ORDER_STATUS } from "@/lib/catalog";
import { orderUrl } from "@/lib/urls";
import { formatDate, formatMoney, timeAgo } from "@/lib/utils";
import { claimBoostAction } from "@/server/actions/seller";
import { db } from "@/server/db";
import type { BoostOrderConfig } from "@/server/orders";
import { requireSeller } from "@/server/session";

function addonIds(cfg: BoostOrderConfig | null): string[] {
  const sel = cfg?.selection as { addons?: unknown } | null | undefined;
  return Array.isArray(sel?.addons) ? sel.addons.filter((a): a is string => typeof a === "string") : [];
}

export default async function BoosterBoardPage() {
  const { profile } = await requireSeller("boost");
  const proBooster = /grand\s*master|challenger/i.test(profile.peakRank ?? "");

  const [board, mine] = await Promise.all([
    db.order.findMany({
      where: { type: "BOOST", status: "PAID", boosterId: null },
      orderBy: { paidAt: "desc" },
      take: 50,
      // Buyer identity and credentials are deliberately not selected.
      select: { id: true, number: true, title: true, summary: true, gameName: true, gameSlug: true, payoutAmount: true, paidAt: true, boostConfig: true },
    }),
    db.order.findMany({
      where: { type: "BOOST", boosterId: profile.id },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { id: true, number: true, title: true, status: true, payoutAmount: true, startedAt: true, completedAt: true, boostProgress: true },
    }),
  ]);

  // Priority orders first, then newest.
  const sorted = [...board].sort((a, b) => {
    const pa = addonIds(a.boostConfig as BoostOrderConfig | null).includes("priority") ? 1 : 0;
    const pb = addonIds(b.boostConfig as BoostOrderConfig | null).includes("priority") ? 1 : 0;
    return pb - pa;
  });

  return (
    <>
      <PageHeader
        title="Booster board"
        description="Paid boosting orders waiting for a booster. Claim one and it's yours: the buyer is notified and you can start right away."
      />

      <section aria-labelledby="board-h">
        <h2 id="board-h" className="sr-only">
          Available orders
        </h2>
        {sorted.length ? (
          <ul className="space-y-3">
            {sorted.map((o) => {
              const cfg = o.boostConfig as BoostOrderConfig | null;
              const addons = addonIds(cfg);
              const priority = addons.includes("priority");
              const needsPro = addons.includes("pro-booster");
              const facts = (cfg?.facts ?? []).filter((f) => f.label !== "Extras");
              const extras = (cfg?.facts ?? []).find((f) => f.label === "Extras")?.value;
              const blocked = needsPro && !proBooster;
              return (
                <li key={o.id} className="panel-flat grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <h3 className="text-lg font-medium text-ink">{o.title}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-[0.8125rem] text-ink-2">{o.gameName}</span>
                      {priority ? (
                        <StatusChip tone="p1">
                          <Zap className="-ml-0.5 size-3" aria-hidden /> Priority
                        </StatusChip>
                      ) : null}
                      {needsPro ? (
                        <StatusChip tone="p2">
                          <Crown className="-ml-0.5 size-3" aria-hidden /> GM+ only
                        </StatusChip>
                      ) : null}
                      <span className="text-[0.8125rem] text-ink-3">Paid {o.paidAt ? timeAgo(o.paidAt) : "—"}</span>
                    </div>
                    {facts.length ? (
                      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 xl:grid-cols-4">
                        {facts.map((f) => (
                          <div key={f.label} className="min-w-0">
                            <dt className="text-[0.75rem] text-ink-3">{f.label}</dt>
                            <dd className="truncate text-sm text-ink-2" title={f.value}>
                              {f.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : o.summary ? (
                      <p className="mt-2 text-sm text-ink-2">{o.summary}</p>
                    ) : null}
                    {extras ? <p className="mt-3 text-[0.8125rem] text-ink-2">Extras: {extras}</p> : null}
                  </div>

                  <div className="flex items-center justify-between gap-6 border-t border-cab-4 pt-4 lg:flex-col lg:items-end lg:border-t-0 lg:pt-0">
                    <div className="lg:text-right">
                      <p className="text-[0.75rem] text-ink-3">You earn</p>
                      <p className="t-display text-4xl leading-none text-ink tnum">{formatMoney(o.payoutAmount)}</p>
                      {cfg?.etaHours ? (
                        <p className="mt-1 flex items-center gap-1 text-[0.8125rem] text-ink-3 lg:justify-end">
                          <Clock className="size-3.5" aria-hidden /> {formatEta(cfg.etaHours)}
                        </p>
                      ) : null}
                    </div>
                    <ActionForm action={claimBoostAction}>
                      <input type="hidden" name="orderId" value={o.id} />
                      <SubmitButton className="btn-p2" pendingText="Claiming…" disabled={blocked}>
                        {blocked ? "GM+ required" : "Claim order"}
                      </SubmitButton>
                    </ActionForm>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Board is empty">New boosting orders appear here as soon as they're paid. Check back soon.</EmptyState>
        )}
      </section>

      <section className="mt-12" aria-labelledby="mine-h">
        <h2 id="mine-h" className="t-display text-3xl text-ink uppercase">
          My boosts
        </h2>
        {mine.length ? (
          <div className="panel-flat mt-4 overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th className="text-right">You earn</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((o) => {
                  const st = ORDER_STATUS[o.status];
                  const progress = o.boostProgress as { currentRank?: string; wins?: number; losses?: number; paused?: boolean } | null;
                  return (
                    <tr key={o.id}>
                      <td className="max-w-[24rem] min-w-[15rem]">
                        <Link href={orderUrl(o.number)} className="group block">
                          <span className="font-pixel text-[0.6875rem] text-ink-3 uppercase">{o.number}</span>
                          <span className="block truncate text-ink group-hover:text-phosphor">{o.title}</span>
                        </Link>
                      </td>
                      <td>
                        <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      </td>
                      <td className="text-[0.8125rem] text-ink-2">
                        {progress?.paused ? <span className="text-warn">Paused by buyer · </span> : null}
                        {progress?.currentRank ?? "—"}
                        {progress?.wins !== undefined || progress?.losses !== undefined ? (
                          <span className="text-ink-3 tnum">
                            {" "}
                            · {progress?.wins ?? 0}W {progress?.losses ?? 0}L
                          </span>
                        ) : null}
                      </td>
                      <td className="text-right text-ink tnum">{formatMoney(o.payoutAmount)}</td>
                      <td className="whitespace-nowrap text-ink-3">{formatDate(o.startedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No boosts yet" className="mt-4">
            Orders you claim are listed here with their progress.
          </EmptyState>
        )}
      </section>
    </>
  );
}

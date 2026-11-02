import { ArrowRight, Clock, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationForm } from "@/components/seller/application-form";
import { APPLICATION_TYPES, type ApplicationTypeId } from "@/components/seller/constants";
import { StatusChip } from "@/components/ui";
import { SELLER_STATUS } from "@/lib/catalog";
import { site } from "@/lib/site";
import { formatDate, formatMoney, str } from "@/lib/utils";
import { applyAction } from "@/server/actions/seller";
import { getGames } from "@/server/catalog";
import { getCurrentUser } from "@/server/session";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "Sell or boost on Boosterinio",
  description:
    "Apply to sell game accounts, currency, items and top-ups, or to claim League of Legends boosting orders. Escrow-protected payments, clear fees and payouts by PayPal, bank transfer or crypto.",
  alternates: { canonical: "/sell" },
};

const RULES = [
  "Deliver exactly what your listing describes, within the delivery time you set.",
  "No stolen, recovered or shared accounts, and no chargeback-funded currency.",
  "Boosters play with their own skill only: no scripts, no third-party programs, no chatting in game.",
  "Keep every conversation with buyers in the order chat so staff can help if something goes wrong.",
];

export default async function SellPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const [user, settings, games] = await Promise.all([getCurrentUser(), getSettings(), getGames()]);
  const profile = user?.sellerProfile ?? null;
  const preferBooster = str(sp.as) === "booster";
  const keepPct = 100 - settings.marketplaceFeePct;

  const appType: ApplicationTypeId =
    profile && (profile.applicationType === "SELLER" || profile.applicationType === "BOOSTER" || profile.applicationType === "BOTH")
      ? profile.applicationType
      : preferBooster
        ? "BOOSTER"
        : "SELLER";

  return (
    <div className="mx-auto max-w-[1320px] px-4 pt-10 pb-6 sm:px-6 sm:pt-14">
      {/* Offer */}
      <section className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div>
          <h1 className="t-display t-extrude text-[3.4rem] leading-[0.9] text-ink uppercase sm:text-7xl">
            {preferBooster ? "Boost with" : "Sell & boost on"}
            <br />
            {site.name}
          </h1>
          <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-ink-2">
            Apply once and our staff review you. Once you&apos;re approved you can list game goods for any of our {games.length} games, claim paid
            League of Legends boosting orders, or both. Buyers pay up front and we hold the money until the order is done, so you never chase a
            payment.
          </p>

          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            <div className="panel p-5">
              <h2 className="t-display text-3xl text-ink uppercase">Sellers</h2>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-2">
                <li>List accounts, currency, items, top-ups and gift cards.</li>
                <li>Pre-load codes or logins and they deliver the second a payment clears.</li>
                <li>Keep {keepPct}% of every sale; the price you set is the price buyers see.</li>
              </ul>
            </div>
            <div className="panel p-5">
              <h2 className="t-display text-3xl text-ink uppercase">Boosters</h2>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-2">
                <li>Paid orders land on the booster board; claim the ones that fit your schedule.</li>
                <li>Every order shows the exact goal, server, queue and extras before you claim it.</li>
                <li>Earn {settings.boosterPayoutPct}% of each order you complete.</li>
              </ul>
            </div>
          </div>

          <a href="#apply" className="btn btn-ghost mt-8">
            {profile ? "See your application" : "Start your application"} <ArrowRight className="size-4" />
          </a>
        </div>

        {/* Every number pinned at its source: the fee readout on the CRT. */}
        <aside className="crt p-6 sm:p-7" aria-label="Fees and payouts">
          <dl className="divide-y divide-phosphor/10">
            <Readout label="Marketplace fee" value={`${settings.marketplaceFeePct}%`} note={`You keep ${keepPct}% of every sale.`} />
            <Readout label="Booster share" value={`${settings.boosterPayoutPct}%`} note="Of the order price, paid for each boost you complete." />
            <Readout
              label="Escrow release"
              value={`${settings.autoCompleteHours} h`}
              note="After delivery, or sooner when the buyer confirms."
            />
            <Readout label="Minimum payout" value={formatMoney(settings.minPayoutCents)} note="PayPal, bank transfer (IBAN) or USDT (TRC20)." />
          </dl>
        </aside>
      </section>

      {/* Approval steps: a real sequence, so it's numbered. */}
      <section className="mt-20" aria-labelledby="how-h">
        <h2 id="how-h" className="t-display text-4xl text-ink uppercase sm:text-5xl">
          How approval works
        </h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          <Step n={1} title="Apply">
            Tell us what you want to sell or the rank you play at, which games and servers, and how to reach you on Discord.
          </Step>
          <Step n={2} title="Staff review">
            A person checks your experience and any profile link you share. If we need more, we ask on Discord or by email.
          </Step>
          <Step n={3} title="Start earning">
            Sellers publish listings{settings.requireListingApproval ? ", which staff check before they go live" : ""}. Boosters claim paid orders from the
            booster board.
          </Step>
        </ol>
      </section>

      {/* Application */}
      <section id="apply" className="mt-20 grid scroll-mt-28 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px]" aria-labelledby="apply-h">
        <div className="panel p-6 sm:p-8">
          <h2 id="apply-h" className="t-display text-4xl text-ink uppercase sm:text-5xl">
            {profile?.status === "APPROVED" ? "You're approved" : profile?.status === "PENDING" ? "Application sent" : "Apply"}
          </h2>

          {!user ? (
            <div className="mt-4">
              <p className="max-w-[56ch] text-ink-2">Create a free account first. It takes a minute, and your application is linked to it.</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="/register?next=/sell" className="btn btn-coin btn-lg">
                  Create account to apply
                </Link>
                <Link href="/login?next=/sell" className="btn btn-ghost btn-lg">
                  I have an account
                </Link>
              </div>
            </div>
          ) : profile?.status === "PENDING" ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip tone={SELLER_STATUS.PENDING.tone}>{SELLER_STATUS.PENDING.label}</StatusChip>
                <span className="text-sm text-ink-3">Sent {formatDate(profile.updatedAt)}</span>
              </div>
              <p className="max-w-[58ch] text-ink-2">
                Thanks, {profile.displayName}. Staff review applications by hand, so it can take a little while. We&apos;ll email{" "}
                <span className="text-ink">{user.email}</span> with the result.
              </p>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Fact label="Applied as">{APPLICATION_TYPES.find((t) => t.id === profile.applicationType)?.label ?? profile.applicationType}</Fact>
                <Fact label="Games">
                  {profile.games
                    .map((slug) => games.find((g) => g.slug === slug)?.name ?? slug)
                    .slice(0, 6)
                    .join(", ")}
                  {profile.games.length > 6 ? ` and ${profile.games.length - 6} more` : ""}
                </Fact>
              </dl>
            </div>
          ) : profile?.status === "APPROVED" ? (
            <div className="mt-4">
              <p className="max-w-[58ch] text-ink-2">
                Your store <span className="text-ink">{profile.displayName}</span> is active
                {profile.canSell && profile.canBoost ? " for selling and boosting" : profile.canBoost ? " for boosting" : " for selling"}.
              </p>
              <Link href="/seller" className="btn btn-coin btn-lg mt-6">
                Open seller dashboard
              </Link>
            </div>
          ) : profile?.status === "SUSPENDED" ? (
            <div className="mt-4">
              <StatusChip tone={SELLER_STATUS.SUSPENDED.tone}>{SELLER_STATUS.SUSPENDED.label}</StatusChip>
              <p className="mt-4 max-w-[58ch] text-ink-2">
                Your seller account is suspended, so you can&apos;t list items or claim orders right now.
                {profile.reviewNote ? (
                  <>
                    {" "}
                    Staff note: <span className="text-ink">{profile.reviewNote}</span>
                  </>
                ) : null}
              </p>
              <Link href="/support" className="btn btn-ghost mt-6">
                Contact support
              </Link>
            </div>
          ) : (
            <div className="mt-4">
              {profile?.status === "REJECTED" ? (
                <div className="mb-8 rounded-[12px] border border-bad/40 bg-bad/5 p-4">
                  <StatusChip tone={SELLER_STATUS.REJECTED.tone}>Not approved</StatusChip>
                  <p className="mt-3 text-sm text-ink-2">
                    {profile.reviewNote ? (
                      <>
                        Staff note: <span className="text-ink">{profile.reviewNote}</span>
                      </>
                    ) : (
                      "Your last application wasn't approved."
                    )}{" "}
                    You can update your details and apply again.
                  </p>
                </div>
              ) : (
                <p className="mb-8 max-w-[58ch] text-ink-2">Everything here is only seen by our staff.</p>
              )}
              <ApplicationForm
                action={applyAction}
                resubmit={profile?.status === "REJECTED"}
                games={games.map((g) => ({ slug: g.slug, name: g.name, boosting: g.boostingEnabled }))}
                defaults={{
                  applicationType: appType,
                  displayName: profile?.displayName ?? user.name,
                  country: profile?.country ?? "",
                  discord: profile?.discord ?? "",
                  games: profile?.games ?? (preferBooster ? ["league-of-legends"] : []),
                  experience: profile?.experience ?? "",
                  peakRank: profile?.peakRank ?? "",
                  servers: profile?.servers.join(", ") ?? "",
                  proofUrl: profile?.proofUrl ?? "",
                }}
              />
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="panel-flat p-5">
            <h3 className="flex items-center gap-2 font-medium text-ink">
              <ShieldCheck className="size-4 text-phosphor" /> The rules
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-2">
              {RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <div className="panel-flat p-5">
            <h3 className="flex items-center gap-2 font-medium text-ink">
              <Clock className="size-4 text-phosphor" /> When you get paid
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">
              Earnings sit in escrow while an order is open. They move to your available balance when the buyer confirms, or{" "}
              {settings.autoCompleteHours} hours after delivery if nobody opens a dispute. Request a payout from your wallet once you have at
              least {formatMoney(settings.minPayoutCents)}.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Readout({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-6 py-4 first:pt-0 last:pb-0">
      <dt className="col-start-1 row-start-1 font-pixel text-[0.6875rem] text-[#9fcfc6] uppercase">{label}</dt>
      <dd className="t-display t-phosphor col-start-2 row-span-2 row-start-1 text-5xl leading-none tnum">{value}</dd>
      <dd className="col-start-1 row-start-2 mt-1 text-sm leading-snug text-[#b9dcd5]">{note}</dd>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="t-display grid size-12 shrink-0 place-items-center rounded-[12px] bg-cab-3 text-3xl text-p1 tnum" aria-hidden>
        {n}
      </span>
      <div>
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{children}</p>
      </div>
    </li>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] bg-cab-3 px-3 py-2.5">
      <dt className="text-[0.75rem] text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-ink">{children}</dd>
    </div>
  );
}

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader, StatTile, Stars, StatusChip } from "@/components/ui";
import { ORDER_STATUS } from "@/lib/catalog";
import { orderUrl, sellerUrl } from "@/lib/urls";
import { formatMoney, ratingOf, timeAgo } from "@/lib/utils";
import { db } from "@/server/db";
import { requireSeller } from "@/server/session";

export default async function SellerOverviewPage() {
  const { profile } = await requireSeller();
  const rating = ratingOf(profile.ratingSum, profile.ratingCount);

  const [needsAction, liveListings, openPayout] = await Promise.all([
    db.order.findMany({
      where: {
        OR: [
          ...(profile.canSell ? [{ type: "MARKET" as const, sellerId: profile.id, status: { in: ["PAID" as const, "IN_PROGRESS" as const] } }] : []),
          ...(profile.canBoost ? [{ type: "BOOST" as const, boosterId: profile.id, status: "IN_PROGRESS" as const }] : []),
          { status: "DISPUTED" as const, OR: [{ sellerId: profile.id }, { boosterId: profile.id }] },
        ],
      },
      orderBy: { paidAt: "asc" },
      take: 20,
      select: { id: true, number: true, title: true, type: true, status: true, paidAt: true, payoutAmount: true, boostProgress: true },
    }),
    profile.canSell ? db.listing.count({ where: { sellerId: profile.id, status: "ACTIVE" } }) : 0,
    db.payout.findFirst({ where: { sellerId: profile.id, status: "REQUESTED" }, select: { amount: true, createdAt: true } }),
  ]);

  const primary = profile.canSell
    ? { href: "/seller/listings/new", label: "New listing" }
    : profile.canBoost
      ? { href: "/seller/boosts", label: "Open booster board" }
      : null;

  return (
    <>
      <PageHeader
        title="Overview"
        description={
          <>
            Store <span className="text-ink">{profile.displayName}</span>
            {profile.canSell && profile.canBoost ? " · selling and boosting" : profile.canBoost ? " · boosting" : " · selling"}
          </>
        }
        actions={
          <>
            <Link href={sellerUrl(profile.slug)} className="btn btn-ghost">
              View storefront
            </Link>
            {primary ? (
              <Link href={primary.href} className="btn btn-coin">
                {primary.label}
              </Link>
            ) : null}
          </>
        }
      />

      {!profile.canSell && !profile.canBoost ? (
        <div className="mb-8 rounded-[12px] border border-warn/40 bg-warn/5 p-4 text-sm text-ink-2">
          Your account is approved but no selling or boosting permissions are switched on yet. Staff will enable them, or{" "}
          <Link href="/support" className="text-phosphor underline">
            ask support
          </Link>
          .
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Available" value={formatMoney(profile.balance)} sub="Ready to withdraw" href="/seller/wallet" />
        <StatTile label="In escrow" value={formatMoney(profile.pendingBalance)} sub="Released on completion" href="/seller/wallet" />
        <StatTile label="Total earned" value={formatMoney(profile.totalEarned)} />
        <StatTile
          label="Rating"
          value={rating ?? "—"}
          sub={
            rating ? (
              <span className="flex items-center gap-2">
                <Stars value={rating} /> {profile.ratingCount} review{profile.ratingCount === 1 ? "" : "s"}
              </span>
            ) : (
              "No reviews yet"
            )
          }
        />
        <StatTile label="Completed orders" value={profile.completedOrders} sub={profile.canSell ? `${liveListings} live listing${liveListings === 1 ? "" : "s"}` : undefined} />
      </div>

      {openPayout ? (
        <p className="mt-4 text-sm text-ink-2">
          Payout of <span className="text-ink tnum">{formatMoney(openPayout.amount)}</span> requested {timeAgo(openPayout.createdAt)}, waiting for staff.
        </p>
      ) : null}

      <section className="mt-10" aria-labelledby="todo-h">
        <h2 id="todo-h" className="t-display text-3xl text-ink uppercase">
          Needs your action
        </h2>
        {needsAction.length ? (
          <div className="panel-flat mt-4 overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>What to do</th>
                  <th className="text-right">You earn</th>
                  <th className="text-right">Paid</th>
                </tr>
              </thead>
              <tbody>
                {needsAction.map((o) => {
                  const st = ORDER_STATUS[o.status];
                  const todo =
                    o.status === "DISPUTED"
                      ? "Reply in the order chat with your evidence"
                      : o.type === "BOOST"
                        ? "Post progress, mark finished when the goal is reached"
                        : "Deliver the order";
                  return (
                    <tr key={o.id}>
                      <td className="max-w-[22rem]">
                        <Link href={orderUrl(o.number)} className="group block">
                          <span className="font-pixel text-[0.6875rem] text-ink-3 uppercase">{o.number}</span>
                          <span className="block truncate text-ink group-hover:text-phosphor">{o.title}</span>
                        </Link>
                      </td>
                      <td>
                        <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      </td>
                      <td className="text-ink-2">{todo}</td>
                      <td className="text-right text-ink tnum">{formatMoney(o.payoutAmount)}</td>
                      <td className="text-right text-ink-3">{o.paidAt ? timeAgo(o.paidAt) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="All clear" className="mt-4">
            Nothing is waiting on you. New sales and claimed boosts show up here.
          </EmptyState>
        )}
      </section>

      <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Shortcuts">
        {profile.canSell ? <Shortcut href="/seller/listings" title="Listings" text="Edit, pause or restock what you sell." /> : null}
        {profile.canBoost ? <Shortcut href="/seller/boosts" title="Booster board" text="Claim paid boosting orders." /> : null}
        <Shortcut href="/seller/wallet" title="Wallet" text="Balances, history and payouts." />
        <Shortcut href="/seller/profile" title="Store profile" text="Name, bio, avatar and payout details." />
      </section>
    </>
  );
}

function Shortcut({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href} className="group panel-flat flex items-center justify-between gap-3 p-4 transition-colors hover:border-cab-5">
      <span>
        <span className="block font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-[0.8125rem] text-ink-3">{text}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-phosphor" />
    </Link>
  );
}

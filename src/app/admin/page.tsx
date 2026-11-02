import type { Metadata } from "next";
import Link from "next/link";
import { Numeral, TableWrap } from "@/components/admin/shared";
import { EmptyState, PageHeader, StatusChip } from "@/components/ui";
import { ORDER_STATUS } from "@/lib/catalog";
import { cn, formatMoney, timeAgo } from "@/lib/utils";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Overview" };

const DAY = 24 * 3600_000;

export default async function AdminOverviewPage() {
  await requireStaff();
  const since = new Date(Date.now() - 30 * DAY);

  const [applications, listings, tickets, disputes, payouts, boosts, reports, revenue, newUsers, latest, pendingPayouts] = await Promise.all([
    db.sellerProfile.count({ where: { status: "PENDING" } }),
    db.listing.count({ where: { status: "PENDING" } }),
    db.ticket.count({ where: { status: "OPEN" } }),
    db.dispute.count({ where: { status: "OPEN" } }),
    db.payout.count({ where: { status: "REQUESTED" } }),
    db.order.count({ where: { type: "BOOST", status: "PAID", boosterId: null } }),
    db.report.count({ where: { status: "OPEN" } }),
    db.order.aggregate({
      where: { paidAt: { gte: since }, status: { notIn: ["REFUNDED", "CANCELLED"] } },
      _sum: { total: true, platformFee: true },
      _count: { _all: true },
    }),
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { buyer: { select: { name: true, email: true } } },
    }),
    db.payout.aggregate({ where: { status: "REQUESTED" }, _sum: { amount: true } }),
  ]);

  const queues = [
    { href: "/admin/applications", label: "Applications to review", value: applications, hint: "Sellers and boosters waiting for approval" },
    { href: "/admin/listings", label: "Listings in review", value: listings, hint: "New or edited listings" },
    { href: "/admin/tickets", label: "Tickets waiting", value: tickets, hint: "Waiting for a staff reply" },
    { href: "/admin/disputes", label: "Open disputes", value: disputes, hint: "Funds frozen until resolved", alarm: true },
    { href: "/admin/payouts", label: "Payout requests", value: payouts, hint: payouts ? `${formatMoney(pendingPayouts._sum.amount ?? 0)} to send` : "Nothing to send" },
    { href: "/admin/orders?type=BOOST&status=PAID", label: "Unclaimed boosts", value: boosts, hint: "Paid, no booster yet" },
    { href: "/admin/reports", label: "Open reports", value: reports, hint: "Flagged listings and sellers" },
  ];
  const waiting = queues.reduce((n, q) => n + q.value, 0);
  const busyQueues = queues.filter((q) => q.value > 0).length;
  const clear = waiting === 0;

  return (
    <>
      <PageHeader title="Overview" description="Everything waiting on staff, plus the last 30 days of business." />

      <section aria-labelledby="queues-title">
        <h2 id="queues-title" className="sr-only">
          Queues
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {queues.map((q) => (
            <Link key={q.href} href={q.href} className="panel-flat group flex items-start justify-between gap-3 p-4 transition-colors hover:border-cab-5">
              <div className="min-w-0">
                <p className="text-sm text-ink-2 group-hover:text-ink">{q.label}</p>
                <p className="mt-1 text-[0.75rem] text-ink-3">{q.hint}</p>
              </div>
              <Numeral className={cn("text-[2.6rem]", q.value === 0 ? "text-ink-3" : q.alarm ? "text-bad" : "text-p1")}>{q.value}</Numeral>
            </Link>
          ))}
          <div className="panel-flat flex flex-col justify-center gap-2 p-4">
            <span className={cn("chip self-start", clear ? "text-ok" : "text-warn")}>{clear ? "All clear" : "Work waiting"}</span>
            <p className="text-[0.8125rem] text-ink-3">
              {clear ? "Every queue is empty." : `${waiting} ${waiting === 1 ? "item" : "items"} across ${busyQueues} ${busyQueues === 1 ? "queue" : "queues"}.`}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="money-title" className="mt-10">
        <h2 id="money-title" className="mb-3 text-[0.9375rem] font-semibold text-ink">
          Last 30 days
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="panel-flat p-4">
            <p className="text-[0.8125rem] text-ink-3">Gross sales</p>
            <Numeral className="mt-2 block text-4xl text-ink">{formatMoney(revenue._sum.total ?? 0)}</Numeral>
          </div>
          <div className="panel-flat p-4">
            <p className="text-[0.8125rem] text-ink-3">Platform earnings</p>
            <Numeral className="mt-2 block text-4xl text-phosphor">{formatMoney(revenue._sum.platformFee ?? 0)}</Numeral>
          </div>
          <div className="panel-flat p-4">
            <p className="text-[0.8125rem] text-ink-3">Paid orders</p>
            <Numeral className="mt-2 block text-4xl text-ink">{revenue._count._all}</Numeral>
          </div>
          <div className="panel-flat p-4">
            <p className="text-[0.8125rem] text-ink-3">New accounts</p>
            <Numeral className="mt-2 block text-4xl text-ink">{newUsers}</Numeral>
          </div>
        </div>
      </section>

      <section aria-labelledby="latest-title" className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="latest-title" className="text-[0.9375rem] font-semibold text-ink">
            Latest orders
          </h2>
          <Link href="/admin/orders" className="text-sm text-phosphor hover:underline">
            All orders
          </Link>
        </div>
        {latest.length ? (
          <TableWrap>
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Item</th>
                  <th>Buyer</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((o) => {
                  const s = ORDER_STATUS[o.status];
                  return (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/admin/orders/${o.id}`} className="font-medium text-ink hover:text-phosphor">
                          {o.number}
                        </Link>
                      </td>
                      <td className="max-w-[320px]">
                        <p className="truncate text-ink">{o.title}</p>
                        <p className="truncate text-[0.75rem] text-ink-3">
                          {o.type === "BOOST" ? "Boost" : "Market"} · {o.gameName}
                        </p>
                      </td>
                      <td className="text-ink-2">{o.buyer.email}</td>
                      <td>
                        <StatusChip tone={s.tone}>{s.label}</StatusChip>
                      </td>
                      <td className="text-right tnum">{formatMoney(o.total, o.currency)}</td>
                      <td className="whitespace-nowrap text-ink-3">{timeAgo(o.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="No orders yet">Orders show up here as soon as a buyer checks out.</EmptyState>
        )}
      </section>
    </>
  );
}

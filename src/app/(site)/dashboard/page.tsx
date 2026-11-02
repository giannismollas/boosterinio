import Link from "next/link";
import { EmptyState, LinkTabs, PageHeader, Pagination, StatusChip } from "@/components/ui";
import { ORDER_STATUS } from "@/lib/catalog";
import { formatDate, formatMoney, pageParam, str } from "@/lib/utils";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";

export const metadata = { title: "My orders" };

const TABS = {
  active: { label: "Active", statuses: ["PAID", "IN_PROGRESS", "DELIVERED", "DISPUTED"] },
  unpaid: { label: "Unpaid", statuses: ["PENDING_PAYMENT"] },
  done: { label: "Completed", statuses: ["COMPLETED"] },
  closed: { label: "Refunded & cancelled", statuses: ["REFUNDED", "CANCELLED"] },
} as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/dashboard");
  const sp = await searchParams;
  const tab = (str(sp.tab) in TABS ? str(sp.tab) : "active") as keyof typeof TABS;
  const page = pageParam(sp.page);
  const where = { buyerId: user.id, status: { in: [...TABS[tab].statuses] } };

  const [counts, total, orders] = await Promise.all([
    db.order.groupBy({ by: ["status"], where: { buyerId: user.id }, _count: { _all: true } }),
    db.order.count({ where }),
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 20, take: 20 }),
  ]);
  const countOf = (k: keyof typeof TABS) => counts.filter((c) => (TABS[k].statuses as readonly string[]).includes(c.status)).reduce((n, c) => n + c._count._all, 0);

  return (
    <>
      <PageHeader
        title="My orders"
        description="Track your boosts and purchases, chat with sellers and confirm deliveries."
        actions={
          <Link href="/league-of-legends/boosting" className="btn btn-ghost">
            New boost
          </Link>
        }
      />
      <LinkTabs
        current={tab}
        items={(Object.keys(TABS) as (keyof typeof TABS)[]).map((k) => ({ key: k, label: TABS[k].label, href: `/dashboard?tab=${k}`, count: countOf(k) }))}
      />
      {orders.length ? (
        <div className="panel-flat overflow-x-auto">
          <table className="table min-w-[680px]">
            <thead>
              <tr>
                <th>Order</th>
                <th>Item</th>
                <th>Status</th>
                <th className="text-right">Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/orders/${o.number}`} className="font-medium text-ink hover:text-phosphor">
                      {o.number}
                    </Link>
                  </td>
                  <td className="max-w-[320px]">
                    <Link href={`/orders/${o.number}`} className="block truncate text-ink-2 hover:text-ink">
                      {o.title}
                    </Link>
                    <span className="text-[0.75rem] text-ink-3">{o.gameName}</span>
                  </td>
                  <td>
                    <StatusChip tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</StatusChip>
                  </td>
                  <td className="text-right tnum">{formatMoney(o.total)}</td>
                  <td className="text-ink-3">{formatDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title={tab === "active" ? "No active orders" : "Nothing here"}
          action={
            tab === "active" ? (
              <Link href="/league-of-legends/boosting/rank-boost" className="btn btn-coin">
                Insert coin · Start a boost
              </Link>
            ) : null
          }
        >
          {tab === "active" ? "Boosts and purchases you pay for show up here while they're in progress." : "No orders in this list yet."}
        </EmptyState>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / 20)} href={(p) => `/dashboard?tab=${tab}&page=${p}`} />
    </>
  );
}

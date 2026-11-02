import Link from "next/link";
import { EmptyState, LinkTabs, PageHeader, Pagination, StatusChip } from "@/components/ui";
import { ORDER_STATUS } from "@/lib/catalog";
import { orderUrl } from "@/lib/urls";
import { formatDate, formatMoney, pageParam, str } from "@/lib/utils";
import { db } from "@/server/db";
import { requireSeller } from "@/server/session";

const PER_PAGE = 25;

const TABS = [
  { key: "active", label: "Active", statuses: ["PAID", "IN_PROGRESS", "DELIVERED", "DISPUTED"] },
  { key: "completed", label: "Completed", statuses: ["COMPLETED"] },
  { key: "closed", label: "Refunded & cancelled", statuses: ["REFUNDED", "CANCELLED"] },
] as const;

type SaleStatus = (typeof TABS)[number]["statuses"][number];

export default async function SellerOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { profile } = await requireSeller("sell");
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === str(sp.tab)) ?? TABS[0];
  const page = pageParam(sp.page);

  const base = { type: "MARKET" as const, sellerId: profile.id };
  const where = { ...base, status: { in: [...tab.statuses] as SaleStatus[] } };
  const [rows, total, grouped] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: tab.key === "active" ? { paidAt: "asc" } : { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        number: true,
        title: true,
        summary: true,
        gameName: true,
        quantity: true,
        status: true,
        payoutAmount: true,
        paidAt: true,
        deliveredAt: true,
        autoCompleteAt: true,
      },
    }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], where: { ...base, status: { not: "PENDING_PAYMENT" } }, _count: { _all: true } }),
  ]);
  const countOf = (statuses: readonly string[]) => grouped.filter((g) => statuses.includes(g.status)).reduce((n, g) => n + g._count._all, 0);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader title="Sales" description="Orders for your listings. Open an order to deliver it, chat with the buyer, or answer a dispute." />

      <LinkTabs
        current={tab.key}
        items={TABS.map((t) => ({
          key: t.key,
          label: t.label,
          count: countOf(t.statuses),
          href: t.key === "active" ? "/seller/orders" : `/seller/orders?tab=${t.key}`,
        }))}
      />

      {rows.length ? (
        <div className="panel-flat overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th className="text-right">Qty</th>
                <th className="text-right">You earn</th>
                <th>Paid</th>
                <th>Next</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const st = ORDER_STATUS[o.status];
                const next =
                  o.status === "PAID" || o.status === "IN_PROGRESS"
                    ? "Deliver"
                    : o.status === "DELIVERED"
                      ? o.autoCompleteAt
                        ? `Auto-completes ${formatDate(o.autoCompleteAt)}`
                        : "Waiting for buyer"
                      : o.status === "DISPUTED"
                        ? "Reply to dispute"
                        : "—";
                return (
                  <tr key={o.id}>
                    <td className="max-w-[24rem] min-w-[15rem]">
                      <Link href={orderUrl(o.number)} className="group block">
                        <span className="font-pixel text-[0.6875rem] text-ink-3 uppercase">{o.number}</span>
                        <span className="block truncate text-ink group-hover:text-phosphor">{o.title}</span>
                        <span className="block truncate text-[0.8125rem] text-ink-3">{[o.gameName, o.summary].filter(Boolean).join(" · ")}</span>
                      </Link>
                    </td>
                    <td>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </td>
                    <td className="text-right tnum">{o.quantity}</td>
                    <td className="text-right text-ink tnum">{formatMoney(o.payoutAmount)}</td>
                    <td className="whitespace-nowrap text-ink-3">{formatDate(o.paidAt)}</td>
                    <td className="whitespace-nowrap">
                      {next === "Deliver" || next === "Reply to dispute" ? (
                        <Link href={orderUrl(o.number)} className="btn btn-p2 btn-sm">
                          {next}
                        </Link>
                      ) : (
                        <span className="text-[0.8125rem] text-ink-3">{next}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={tab.key === "active" ? "No open sales" : "Nothing here yet"}>
          {tab.key === "active" ? "When a buyer pays for one of your listings, it shows up here for you to deliver." : "Finished orders will be listed here."}
        </EmptyState>
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        href={(p) => `/seller/orders?${new URLSearchParams({ ...(tab.key !== "active" ? { tab: tab.key } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`}
      />
    </>
  );
}

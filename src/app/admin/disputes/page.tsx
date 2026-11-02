import type { Metadata } from "next";
import Link from "next/link";
import { TableWrap } from "@/components/admin/shared";
import { EmptyState, LinkTabs, PageHeader, Pagination, StatusChip } from "@/components/ui";
import type { DisputeStatus } from "@/generated/prisma/client";
import { DISPUTE_STATUS } from "@/lib/catalog";
import { formatMoney, pageParam, str, timeAgo } from "@/lib/utils";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Disputes" };

const PER_PAGE = 25;
const TABS: DisputeStatus[] = ["OPEN", "RESOLVED_REFUND", "RESOLVED_RELEASE", "CLOSED"];

export default async function AdminDisputesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const status = (TABS as string[]).includes(str(sp.status)) ? (str(sp.status) as DisputeStatus) : "OPEN";
  const page = pageParam(sp.page);

  const [counts, total, disputes] = await Promise.all([
    db.dispute.groupBy({ by: ["status"], _count: { _all: true } }),
    db.dispute.count({ where: { status } }),
    db.dispute.findMany({
      where: { status },
      orderBy: { createdAt: status === "OPEN" ? "asc" : "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        openedBy: { select: { email: true } },
        order: { select: { number: true, title: true, total: true, currency: true, type: true, seller: { select: { displayName: true } }, booster: { select: { displayName: true } } } },
      },
    }),
  ]);
  const countOf = (s: DisputeStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <>
      <PageHeader title="Disputes" description="Funds stay frozen until a dispute is resolved. Oldest open disputes come first." />
      <LinkTabs
        current={status}
        items={TABS.map((s) => ({ key: s, href: `/admin/disputes?status=${s}`, label: DISPUTE_STATUS[s].label, count: countOf(s) }))}
      />
      {disputes.length ? (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Reason</th>
                <th>Buyer</th>
                <th>Seller / booster</th>
                <th className="text-right">Amount</th>
                <th>Opened</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((d) => {
                const s = DISPUTE_STATUS[d.status];
                const earner = d.order.type === "MARKET" ? d.order.seller?.displayName : d.order.booster?.displayName;
                return (
                  <tr key={d.id}>
                    <td>
                      <Link href={`/admin/disputes/${d.id}`} className="font-medium whitespace-nowrap text-ink hover:text-phosphor">
                        {d.order.number}
                      </Link>
                      <p className="max-w-[260px] truncate text-[0.75rem] text-ink-3">{d.order.title}</p>
                    </td>
                    <td className="max-w-[280px]">
                      <p className="text-ink">{d.reason}</p>
                      <p className="truncate text-[0.75rem] text-ink-3">{d.details}</p>
                    </td>
                    <td className="text-ink-2">{d.openedBy.email}</td>
                    <td className="text-ink-2">{earner ?? "—"}</td>
                    <td className="text-right whitespace-nowrap tnum">{formatMoney(d.order.total, d.order.currency)}</td>
                    <td className="whitespace-nowrap text-ink-3">{timeAgo(d.createdAt)}</td>
                    <td>
                      <StatusChip tone={s.tone}>{s.label}</StatusChip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <EmptyState title={status === "OPEN" ? "No open disputes" : "Nothing here"}>
          {status === "OPEN" ? "When a buyer disputes an order it lands here and the order's funds are frozen." : "No disputes with this outcome yet."}
        </EmptyState>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} href={(p) => `/admin/disputes?status=${status}${p > 1 ? `&page=${p}` : ""}`} />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar, FilterField, TableWrap } from "@/components/admin/shared";
import { EmptyState, PageHeader, Pagination, StatusChip } from "@/components/ui";
import type { OrderStatus, OrderType, Prisma } from "@/generated/prisma/client";
import { ORDER_STATUS } from "@/lib/catalog";
import { formatDateTime, formatMoney, pageParam, str } from "@/lib/utils";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Orders" };

const PER_PAGE = 25;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const statusParam = str(sp.status);
  const typeParam = str(sp.type);
  const q = str(sp.q).trim();
  const page = pageParam(sp.page);

  const status = statusParam in ORDER_STATUS ? (statusParam as OrderStatus) : undefined;
  const type = typeParam === "BOOST" || typeParam === "MARKET" ? (typeParam as OrderType) : undefined;

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { buyer: { email: { contains: q, mode: "insensitive" } } },
            { title: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        buyer: { select: { email: true } },
        seller: { select: { displayName: true } },
        booster: { select: { displayName: true } },
      },
    }),
  ]);

  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Orders" description={`${total} ${total === 1 ? "order" : "orders"} match these filters.`} />

      <FilterBar resetHref="/admin/orders">
        <FilterField label="Search" className="min-w-[240px] flex-1">
          <input name="q" defaultValue={q} placeholder="Order number, buyer email or title" className="field" />
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={status ?? ""} className="field min-w-44">
            <option value="">All statuses</option>
            {Object.entries(ORDER_STATUS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Type">
          <select name="type" defaultValue={type ?? ""} className="field min-w-36">
            <option value="">All types</option>
            <option value="BOOST">Boosting</option>
            <option value="MARKET">Marketplace</option>
          </select>
        </FilterField>
      </FilterBar>

      {orders.length ? (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Item</th>
                <th>Buyer</th>
                <th>Seller / booster</th>
                <th>Status</th>
                <th className="text-right">Total</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const s = ORDER_STATUS[o.status];
                const earner = o.type === "MARKET" ? o.seller?.displayName : o.booster?.displayName;
                return (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/orders/${o.id}`} className="font-medium whitespace-nowrap text-ink hover:text-phosphor">
                        {o.number}
                      </Link>
                    </td>
                    <td className="max-w-[300px]">
                      <p className="truncate text-ink">{o.title}</p>
                      <p className="truncate text-[0.75rem] text-ink-3">
                        {o.type === "BOOST" ? "Boost" : "Market"} · {o.gameName}
                      </p>
                    </td>
                    <td className="text-ink-2">{o.buyer.email}</td>
                    <td className="text-ink-2">
                      {earner ?? <span className="text-ink-3">{o.type === "BOOST" && o.status === "PAID" ? "Unclaimed" : "—"}</span>}
                    </td>
                    <td>
                      <StatusChip tone={s.tone}>{s.label}</StatusChip>
                    </td>
                    <td className="text-right whitespace-nowrap tnum">{formatMoney(o.total, o.currency)}</td>
                    <td className="whitespace-nowrap text-ink-3">{formatDateTime(o.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <EmptyState title="No orders found">Try another status, type or search term.</EmptyState>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} href={qs} />
    </>
  );
}

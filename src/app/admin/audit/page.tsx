import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar, FilterField, TableWrap } from "@/components/admin/shared";
import { EmptyState, PageHeader, Pagination } from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import { formatDateTime, pageParam, str } from "@/lib/utils";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Audit log" };

const PER_PAGE = 50;

const ENTITY_HREF: Record<string, (id: string) => string> = {
  Order: (id) => `/admin/orders/${id}`,
  Dispute: (id) => `/admin/disputes/${id}`,
  Ticket: (id) => `/admin/tickets/${id}`,
  SellerProfile: (id) => `/admin/applications/${id}`,
  Listing: (id) => `/admin/listings/${id}`,
  User: (id) => `/admin/users/${id}`,
  Game: (id) => `/admin/games/${id}`,
  BoostService: (id) => `/admin/services/${id}`,
  Payout: () => `/admin/payouts`,
  Coupon: () => `/admin/coupons`,
  Review: () => `/admin/reviews`,
  Report: () => `/admin/reports`,
};

function metaText(meta: unknown) {
  if (meta === null || meta === undefined) return "";
  const text = JSON.stringify(meta);
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const entity = str(sp.entity);
  const action = str(sp.action).trim();
  const page = pageParam(sp.page);

  const where: Prisma.AuditLogWhereInput = {
    ...(entity ? { entity } : {}),
    ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
  };
  const [total, logs, entities] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { actor: { select: { id: true, name: true, email: true } } },
    }),
    db.auditLog.groupBy({ by: ["entity"], _count: { _all: true }, orderBy: { entity: "asc" } }),
  ]);

  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (entity) params.set("entity", entity);
    if (action) params.set("action", action);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/audit${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Audit log" description="Every staff decision, payment anomaly and secret reveal, newest first." />
      <FilterBar resetHref="/admin/audit">
        <FilterField label="Area">
          <select name="entity" defaultValue={entity} className="field min-w-48">
            <option value="">Everything</option>
            {entities.map((e) => (
              <option key={e.entity} value={e.entity}>
                {e.entity} ({e._count._all})
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Action contains" className="min-w-[220px] flex-1">
          <input name="action" defaultValue={action} placeholder="e.g. refund, ban, approve" className="field" />
        </FilterField>
      </FilterBar>

      {logs.length ? (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const href = l.entityId && ENTITY_HREF[l.entity] ? ENTITY_HREF[l.entity](l.entityId) : null;
                return (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap text-ink-3">{formatDateTime(l.createdAt)}</td>
                    <td>
                      {l.actor ? (
                        <Link href={`/admin/users/${l.actor.id}`} className="text-ink-2 hover:text-phosphor">
                          {l.actor.name}
                        </Link>
                      ) : (
                        <span className="text-ink-3">System</span>
                      )}
                    </td>
                    <td>
                      <span className="chip chip-plain text-ink">{l.action}</span>
                    </td>
                    <td className="whitespace-nowrap">
                      {href ? (
                        <Link href={href} className="text-phosphor hover:underline">
                          {l.entity}
                        </Link>
                      ) : (
                        <span className="text-ink-2">{l.entity}</span>
                      )}
                    </td>
                    <td className="max-w-[420px] truncate text-[0.8125rem] text-ink-3" title={l.meta ? JSON.stringify(l.meta) : undefined}>
                      {metaText(l.meta)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <EmptyState title="Nothing logged yet">Staff decisions like approvals, refunds and bans are recorded here automatically.</EmptyState>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} href={qs} />
    </>
  );
}

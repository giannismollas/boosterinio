import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar, FilterField, TableWrap } from "@/components/admin/shared";
import { EmptyState, LinkTabs, PageHeader, Pagination, StatusChip } from "@/components/ui";
import type { Prisma, TicketCategory, TicketPriority, TicketStatus } from "@/generated/prisma/client";
import { TICKET_CATEGORIES, TICKET_PRIORITY, TICKET_STATUS } from "@/lib/catalog";
import { pageParam, str, timeAgo } from "@/lib/utils";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Tickets" };

const PER_PAGE = 25;
const STATUSES: TicketStatus[] = ["OPEN", "ANSWERED", "CLOSED"];

export default async function AdminTicketsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const statusParam = str(sp.status) || "OPEN";
  const status = (STATUSES as string[]).includes(statusParam) ? (statusParam as TicketStatus) : undefined; // "ALL" → undefined
  const category = str(sp.category) in TICKET_CATEGORIES ? (str(sp.category) as TicketCategory) : undefined;
  const priority = str(sp.priority) in TICKET_PRIORITY ? (str(sp.priority) as TicketPriority) : undefined;
  const assigned = str(sp.assigned);
  const q = str(sp.q).trim();
  const page = pageParam(sp.page);

  const where: Prisma.TicketWhereInput = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(priority ? { priority } : {}),
    ...(assigned === "me" ? { assignedToId: staff.id } : assigned === "none" ? { assignedToId: null } : {}),
    ...(q
      ? {
          OR: [
            { subject: { contains: q, mode: "insensitive" } },
            { user: { email: { contains: q, mode: "insensitive" } } },
            ...(/^\d+$/.test(q) ? [{ number: Number(q) }] : []),
          ],
        }
      : {}),
  };

  const [counts, total, tickets] = await Promise.all([
    db.ticket.groupBy({ by: ["status"], _count: { _all: true } }),
    db.ticket.count({ where }),
    db.ticket.findMany({
      where,
      orderBy: [{ lastReplyAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        user: { select: { name: true, email: true } },
        assignedTo: { select: { name: true } },
        order: { select: { number: true } },
        _count: { select: { messages: true } },
      },
    }),
  ]);
  const countOf = (s: TicketStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;

  const href = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { status: statusParam, category, priority, assigned: assigned || undefined, q: q || undefined, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return `/admin/tickets${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Tickets" description="Most recent activity first. Replying sets a ticket to Answered and emails the customer." />
      <LinkTabs
        current={status ?? "ALL"}
        items={[
          ...STATUSES.map((s) => ({ key: s, label: TICKET_STATUS[s].label, count: countOf(s), href: href({ status: s, page: undefined }) })),
          { key: "ALL", label: "All", href: href({ status: "ALL", page: undefined }) },
        ]}
      />
      <FilterBar resetHref="/admin/tickets">
        <input type="hidden" name="status" value={statusParam} />
        <FilterField label="Search" className="min-w-[220px] flex-1">
          <input name="q" defaultValue={q} placeholder="Subject, email or ticket number" className="field" />
        </FilterField>
        <FilterField label="Category">
          <select name="category" defaultValue={category ?? ""} className="field min-w-44">
            <option value="">All categories</option>
            {Object.entries(TICKET_CATEGORIES).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Priority">
          <select name="priority" defaultValue={priority ?? ""} className="field min-w-32">
            <option value="">Any</option>
            {Object.entries(TICKET_PRIORITY).map(([k, p]) => (
              <option key={k} value={k}>
                {p.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Assigned">
          <select name="assigned" defaultValue={assigned} className="field min-w-36">
            <option value="">Anyone</option>
            <option value="me">Assigned to me</option>
            <option value="none">Unassigned</option>
          </select>
        </FilterField>
      </FilterBar>

      {tickets.length ? (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Customer</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Assigned</th>
                <th>Status</th>
                <th>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td className="max-w-[340px]">
                    <Link href={`/admin/tickets/${t.id}`} className="block truncate font-medium text-ink hover:text-phosphor">
                      #{t.number} {t.subject}
                    </Link>
                    <p className="text-[0.75rem] text-ink-3">
                      {t._count.messages} {t._count.messages === 1 ? "message" : "messages"}
                      {t.order ? ` · ${t.order.number}` : ""}
                    </p>
                  </td>
                  <td className="text-ink-2">{t.user.email}</td>
                  <td className="text-ink-2">{TICKET_CATEGORIES[t.category]}</td>
                  <td>
                    <StatusChip tone={TICKET_PRIORITY[t.priority].tone}>{TICKET_PRIORITY[t.priority].label}</StatusChip>
                  </td>
                  <td className="text-ink-2">{t.assignedTo?.name ?? <span className="text-ink-3">Unassigned</span>}</td>
                  <td>
                    <StatusChip tone={TICKET_STATUS[t.status].tone}>{TICKET_STATUS[t.status].label}</StatusChip>
                  </td>
                  <td className="whitespace-nowrap text-ink-3">{timeAgo(t.lastReplyAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <EmptyState title={status === "OPEN" ? "Inbox zero" : "No tickets found"}>
          {status === "OPEN" ? "No customer is waiting for a reply right now." : "Try another filter or search term."}
        </EmptyState>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} href={(p) => href({ page: p > 1 ? String(p) : undefined })} />
    </>
  );
}

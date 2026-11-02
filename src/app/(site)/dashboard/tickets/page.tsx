import Link from "next/link";
import { EmptyState, PageHeader, StatusChip } from "@/components/ui";
import { TICKET_CATEGORIES, TICKET_STATUS } from "@/lib/catalog";
import { timeAgo } from "@/lib/utils";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";

export const metadata = { title: "Support tickets" };

export default async function TicketsPage() {
  const user = await requireUser("/dashboard/tickets");
  const tickets = await db.ticket.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { lastReplyAt: "desc" }],
    take: 100,
    include: { order: { select: { number: true } } },
  });
  return (
    <>
      <PageHeader
        title="Support tickets"
        description="Questions about an order, a payment or your account. Our staff reply here and by email."
        actions={
          <Link href="/dashboard/tickets/new" className="btn btn-coin">
            New ticket
          </Link>
        }
      />
      {tickets.length ? (
        <ul className="divide-y divide-cab-4 overflow-hidden rounded-[14px] border border-cab-4 bg-cab-2">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link href={`/dashboard/tickets/${t.number}`} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-4 transition-colors hover:bg-cab-3">
                <span className="w-16 font-display text-xl text-ink-3 tnum">#{t.number}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{t.subject}</span>
                  <span className="text-[0.8125rem] text-ink-3">
                    {TICKET_CATEGORIES[t.category]}
                    {t.order ? ` · ${t.order.number}` : ""} · updated {timeAgo(t.lastReplyAt)}
                  </span>
                </span>
                <StatusChip tone={TICKET_STATUS[t.status].tone}>{t.status === "ANSWERED" ? "New reply" : TICKET_STATUS[t.status].label}</StatusChip>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No tickets" action={<Link href="/dashboard/tickets/new" className="btn btn-p2">Open a ticket</Link>}>
          Stuck on something? Open a ticket and a member of staff will reply.
        </EmptyState>
      )}
    </>
  );
}

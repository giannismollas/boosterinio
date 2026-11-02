import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KV, Section, Thread } from "@/components/admin/shared";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHeader, StatusChip } from "@/components/ui";
import { ORDER_STATUS, TICKET_CATEGORIES, TICKET_PRIORITY, TICKET_STATUS } from "@/lib/catalog";
import { formatDateTime } from "@/lib/utils";
import { replyTicketAction, ticketQuickAction, updateTicketAction } from "@/server/actions/admin/tickets";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const t = await db.ticket.findUnique({ where: { id }, select: { number: true } });
  return { title: t ? `Ticket #${t.number}` : "Ticket" };
}

export default async function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  const [ticket, staffUsers] = await Promise.all([
    db.ticket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true, _count: { select: { orders: true, tickets: true } } } },
        assignedTo: { select: { id: true, name: true } },
        order: { select: { id: true, number: true, title: true, status: true } },
        messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      },
    }),
    db.user.findMany({ where: { role: { in: ["ADMIN", "SUPPORT"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!ticket) notFound();
  const closed = ticket.status === "CLOSED";

  return (
    <>
      <PageHeader
        title={`Ticket #${ticket.number}`}
        description={ticket.subject}
        actions={
          <>
            <StatusChip tone={TICKET_STATUS[ticket.status].tone}>{TICKET_STATUS[ticket.status].label}</StatusChip>
            <StatusChip tone={TICKET_PRIORITY[ticket.priority].tone}>{TICKET_PRIORITY[ticket.priority].label}</StatusChip>
            {ticket.assignedToId !== staff.id ? (
              <ActionForm action={ticketQuickAction}>
                <input type="hidden" name="id" value={ticket.id} />
                <input type="hidden" name="op" value="claim" />
                <SubmitButton className="btn-ghost btn-sm">Assign to me</SubmitButton>
              </ActionForm>
            ) : null}
            <ActionForm action={ticketQuickAction}>
              <input type="hidden" name="id" value={ticket.id} />
              <input type="hidden" name="op" value={closed ? "reopen" : "close"} />
              <SubmitButton className="btn-ghost btn-sm">{closed ? "Reopen" : "Close ticket"}</SubmitButton>
            </ActionForm>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Section title="Conversation" description="Internal notes are only visible to staff.">
            <Thread
              messages={ticket.messages.map((m) => ({
                id: m.id,
                body: m.body,
                createdAt: m.createdAt,
                author: m.author?.name ?? null,
                kind: m.isStaff ? "STAFF" : "USER",
                internal: m.internal,
                side: m.isStaff ? "right" : "left",
              }))}
              empty="The customer hasn't written anything yet."
            />
          </Section>

          <Section title="Reply" description={closed ? "This ticket is closed. Sending a reply reopens it as Answered." : "The customer gets your reply by email."}>
            <ActionForm action={replyTicketAction} resetOnSuccess className="space-y-3">
              <input type="hidden" name="id" value={ticket.id} />
              <label htmlFor="ticket-reply" className="sr-only">
                Reply
              </label>
              <textarea id="ticket-reply" name="body" required maxLength={5000} className="field min-h-32" placeholder={`Hi ${ticket.user.name.split(" ")[0]}, …`} />
              <div className="flex flex-wrap justify-end gap-2">
                <SubmitButton className="btn-ghost" name="mode" value="note" pendingText="Saving…">
                  Add internal note
                </SubmitButton>
                <SubmitButton className="btn-coin" name="mode" value="reply" pendingText="Sending…">
                  Send reply
                </SubmitButton>
              </div>
            </ActionForm>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Customer">
            <KV
              items={[
                [
                  "Name",
                  <Link key="u" href={`/admin/users/${ticket.user.id}`} className="text-phosphor hover:underline">
                    {ticket.user.name}
                  </Link>,
                ],
                ["Email", ticket.user.email],
                ["Member since", formatDateTime(ticket.user.createdAt)],
                ["Orders", ticket.user._count.orders],
                ["Tickets", ticket.user._count.tickets],
                [
                  "Related order",
                  ticket.order ? (
                    <Link key="o" href={`/admin/orders/${ticket.order.id}`} className="text-phosphor hover:underline">
                      {ticket.order.number} · {ORDER_STATUS[ticket.order.status].label}
                    </Link>
                  ) : null,
                ],
                ["Opened", formatDateTime(ticket.createdAt)],
              ]}
            />
          </Section>

          <Section title="Ticket settings">
            <ActionForm action={updateTicketAction} className="space-y-4">
              <input type="hidden" name="id" value={ticket.id} />
              <div>
                <label htmlFor="t-status" className="label">
                  Status
                </label>
                <select id="t-status" name="status" defaultValue={ticket.status} className="field">
                  {Object.entries(TICKET_STATUS).map(([k, s]) => (
                    <option key={k} value={k}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="t-priority" className="label">
                  Priority
                </label>
                <select id="t-priority" name="priority" defaultValue={ticket.priority} className="field">
                  {Object.entries(TICKET_PRIORITY).map(([k, p]) => (
                    <option key={k} value={k}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="t-category" className="label">
                  Category
                </label>
                <select id="t-category" name="category" defaultValue={ticket.category} className="field">
                  {Object.entries(TICKET_CATEGORIES).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="t-assignee" className="label">
                  Assigned to
                </label>
                <select id="t-assignee" name="assignedToId" defaultValue={ticket.assignedToId ?? ""} className="field">
                  <option value="">Unassigned</option>
                  {staffUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <SubmitButton className="btn-ghost w-full" pendingText="Saving…">
                Save settings
              </SubmitButton>
            </ActionForm>
          </Section>
        </div>
      </div>
    </>
  );
}

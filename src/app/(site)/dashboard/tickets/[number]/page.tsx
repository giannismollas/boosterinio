import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { StatusChip } from "@/components/ui";
import { TICKET_CATEGORIES, TICKET_STATUS } from "@/lib/catalog";
import { cn, formatDateTime } from "@/lib/utils";
import { closeTicketAction, replyTicketAction } from "@/server/actions/tickets";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";

export const metadata = { title: "Ticket" };

export default async function TicketPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUser(`/dashboard/tickets/${number}`);
  // Links use the ticket number; staff notifications may link by id. Accept both.
  const n = Number(number);
  const ticket = await db.ticket.findUnique({
    where: Number.isInteger(n) && n > 0 ? { number: n } : { id: number },
    include: {
      order: { select: { number: true, title: true } },
      messages: { where: { internal: false }, orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!ticket || ticket.userId !== user.id) notFound();
  const st = TICKET_STATUS[ticket.status];

  return (
    <>
      <p className="text-sm text-ink-3">
        <Link href="/dashboard/tickets" className="hover:text-ink">
          Support tickets
        </Link>{" "}
        / #{ticket.number}
      </p>
      <div className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-ink">{ticket.subject}</h1>
          <p className="mt-1 text-sm text-ink-3">
            {TICKET_CATEGORIES[ticket.category]}
            {ticket.order ? (
              <>
                {" "}
                ·{" "}
                <Link href={`/orders/${ticket.order.number}`} className="text-phosphor hover:underline">
                  {ticket.order.number}
                </Link>
              </>
            ) : null}{" "}
            · opened {formatDateTime(ticket.createdAt)}
          </p>
        </div>
        <StatusChip tone={st.tone}>{st.label}</StatusChip>
      </div>

      <ol className="space-y-3">
        {ticket.messages.map((m) => (
          <li key={m.id} className={cn("rounded-[14px] border p-4 sm:p-5", m.isStaff ? "border-phosphor/25 bg-[rgb(255_46_136/0.05)]" : "border-cab-4 bg-cab-2")}>
            <p className="mb-2 text-[0.8125rem] text-ink-3">
              <span className={m.isStaff ? "font-medium text-phosphor" : "font-medium text-ink-2"}>{m.isStaff ? `${m.author?.name ?? "Staff"} · Boosterinio staff` : "You"}</span> ·{" "}
              {formatDateTime(m.createdAt)}
            </p>
            <p className="leading-relaxed whitespace-pre-wrap text-ink">
              {m.body.split(/(\s+)/).map((part, i) =>
                /^(\/uploads\/|https:\/\/)\S+\.(png|jpe?g|webp|gif)$/i.test(part) ? (
                  <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-phosphor underline">
                    image
                  </a>
                ) : (
                  part
                ),
              )}
            </p>
          </li>
        ))}
      </ol>

      <ActionForm action={replyTicketAction} resetOnSuccess className="panel mt-6 space-y-3 p-5">
        <input type="hidden" name="number" value={ticket.number} />
        <label htmlFor="reply" className="label">
          {ticket.status === "CLOSED" ? "Reply to reopen this ticket" : "Your reply"}
        </label>
        <textarea id="reply" name="body" required maxLength={5000} className="field min-h-28" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SubmitButton className="btn-p2" pendingText="Sending…">
            Send reply
          </SubmitButton>
        </div>
      </ActionForm>
      {ticket.status !== "CLOSED" ? (
        <ActionForm action={closeTicketAction} className="mt-3">
          <input type="hidden" name="number" value={ticket.number} />
          <button type="submit" className="text-sm text-ink-3 underline underline-offset-4 hover:text-ink">
            My problem is solved, close this ticket
          </button>
        </ActionForm>
      ) : null}
    </>
  );
}

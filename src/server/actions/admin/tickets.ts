"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, guard, ok, type ActionState } from "@/lib/action";
import { db } from "@/server/db";
import { audit, notify } from "@/server/notify";
import { requireStaff } from "@/server/session";

function refresh(ticketId: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
}

export async function replyTicketAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const id = z.string().min(1).parse(fd.get("id"));
    const body = z.string().trim().min(1, "Write a reply first.").max(5000).parse(fd.get("body"));
    const internal = fd.get("mode") === "note";
    const ticket = await db.ticket.findUnique({ where: { id }, select: { id: true, number: true, userId: true, subject: true, assignedToId: true } });
    if (!ticket) return fail("Ticket not found.");

    await db.ticketMessage.create({ data: { ticketId: id, authorId: staff.id, body, isStaff: true, internal } });
    if (!internal) {
      await db.ticket.update({
        where: { id },
        data: { status: "ANSWERED", lastReplyAt: new Date(), assignedToId: ticket.assignedToId ?? staff.id },
      });
      await notify(ticket.userId, {
        title: `Support replied: #${ticket.number} ${ticket.subject}`,
        body: body.slice(0, 280),
        href: `/dashboard/tickets/${id}`,
        email: true,
      });
    }
    refresh(id);
    return ok(internal ? "Internal note added." : "Reply sent to the customer.");
  });
}

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["OPEN", "ANSWERED", "CLOSED"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  category: z.enum(["ORDER", "PAYMENT", "ACCOUNT", "SELLER", "BOOSTING", "BUG", "OTHER"]),
  assignedToId: z.string().optional(),
});

export async function updateTicketAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const input = updateSchema.parse({
      id: fd.get("id"),
      status: fd.get("status"),
      priority: fd.get("priority"),
      category: fd.get("category"),
      assignedToId: (fd.get("assignedToId") as string) || undefined,
    });
    if (input.assignedToId) {
      const assignee = await db.user.findUnique({ where: { id: input.assignedToId }, select: { role: true } });
      if (!assignee || (assignee.role !== "ADMIN" && assignee.role !== "SUPPORT")) return fail("Tickets can only be assigned to staff.");
    }
    const before = await db.ticket.findUnique({ where: { id: input.id }, select: { status: true, userId: true, number: true, subject: true } });
    if (!before) return fail("Ticket not found.");
    await db.ticket.update({
      where: { id: input.id },
      data: { status: input.status, priority: input.priority, category: input.category, assignedToId: input.assignedToId ?? null },
    });
    if (before.status !== "CLOSED" && input.status === "CLOSED") {
      await notify(before.userId, { title: `Ticket closed: #${before.number}`, body: before.subject, href: `/dashboard/tickets/${input.id}` });
    }
    await audit(staff.id, "ticket.update", "Ticket", input.id, { status: input.status, priority: input.priority, assignedToId: input.assignedToId ?? null });
    refresh(input.id);
    return ok("Ticket updated.");
  });
}

/** Quick actions: close, reopen, or take the ticket. */
export async function ticketQuickAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const id = z.string().min(1).parse(fd.get("id"));
    const op = z.enum(["close", "reopen", "claim"]).parse(fd.get("op"));
    const ticket = await db.ticket.findUnique({ where: { id }, select: { userId: true, number: true, subject: true } });
    if (!ticket) return fail("Ticket not found.");
    if (op === "claim") {
      await db.ticket.update({ where: { id }, data: { assignedToId: staff.id } });
    } else {
      await db.ticket.update({ where: { id }, data: { status: op === "close" ? "CLOSED" : "OPEN" } });
      if (op === "close") {
        await notify(ticket.userId, { title: `Ticket closed: #${ticket.number}`, body: ticket.subject, href: `/dashboard/tickets/${id}` });
      }
    }
    await audit(staff.id, `ticket.${op}`, "Ticket", id);
    refresh(id);
    return ok(op === "claim" ? "Ticket assigned to you." : op === "close" ? "Ticket closed." : "Ticket reopened.");
  });
}

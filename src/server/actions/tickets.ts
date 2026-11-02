"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { TICKET_CATEGORIES } from "@/lib/catalog";
import { fail, guard, ok, type ActionState } from "@/lib/action";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";

class TicketError extends Error {}

const createSchema = z.object({
  subject: z.string().trim().min(5, "Give your ticket a short subject (5+ characters).").max(140),
  category: z.enum(Object.keys(TICKET_CATEGORIES) as [string, ...string[]]),
  body: z.string().trim().min(15, "Tell us a bit more (15+ characters).").max(5000),
  order: z.string().trim().max(20).optional(),
  images: z.array(z.string().max(500)).max(6).default([]),
});

export async function createTicketAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("/dashboard/tickets/new");
  const parsed = createSchema.safeParse({
    subject: fd.get("subject"),
    category: fd.get("category"),
    body: fd.get("body"),
    order: fd.get("order") || undefined,
    images: fd.getAll("images").map(String),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return fail(parsed.error.issues[0].message, fieldErrors);
  }
  const open = await db.ticket.count({ where: { userId: user.id, status: { not: "CLOSED" } } });
  if (open >= 10) return fail("You have 10 open tickets. Reply in an existing one, or close the ones that are solved.");

  let orderId: string | null = null;
  if (parsed.data.order) {
    const order = await db.order.findUnique({ where: { number: parsed.data.order.toUpperCase() }, select: { id: true, buyerId: true, sellerId: true, boosterId: true } });
    const mine = order && (order.buyerId === user.id || (user.sellerProfile && (order.sellerId === user.sellerProfile.id || order.boosterId === user.sellerProfile.id)));
    if (!mine) return fail("That order number isn't one of yours.", { order: "Check the order number." });
    orderId = order.id;
  }
  const attachments = parsed.data.images.filter((u) => u.startsWith("/uploads/") || u.startsWith("https://"));
  const body = attachments.length ? `${parsed.data.body}\n\nAttachments:\n${attachments.join("\n")}` : parsed.data.body;
  const priority = parsed.data.category === "PAYMENT" || orderId ? "HIGH" : "NORMAL";

  const ticket = await db.ticket.create({
    data: {
      userId: user.id,
      subject: parsed.data.subject,
      category: parsed.data.category as never,
      priority,
      orderId,
      messages: { create: { authorId: user.id, body } },
    },
  });
  redirect(`/dashboard/tickets/${ticket.number}`);
}

export async function replyTicketAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  return guard(async () => {
    const number = Number(fd.get("number"));
    const body = z.string().trim().min(1, "Write a reply first.").max(5000).parse(fd.get("body"));
    const ticket = await db.ticket.findUnique({ where: { number } });
    if (!ticket || ticket.userId !== user.id) throw new TicketError("Ticket not found.");
    await db.$transaction([
      db.ticketMessage.create({ data: { ticketId: ticket.id, authorId: user.id, body } }),
      db.ticket.update({ where: { id: ticket.id }, data: { status: "OPEN", lastReplyAt: new Date() } }),
    ]);
    revalidatePath(`/dashboard/tickets/${number}`);
    return ok("Reply sent.");
  }, [TicketError]);
}

export async function closeTicketAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const number = Number(fd.get("number"));
  const res = await db.ticket.updateMany({ where: { number, userId: user.id }, data: { status: "CLOSED" } });
  if (!res.count) return fail("Ticket not found.");
  revalidatePath(`/dashboard/tickets/${number}`);
  return ok("Ticket closed. Reply any time to reopen it.");
}

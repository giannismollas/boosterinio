"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, guard, ok, type ActionState } from "@/lib/action";
import { decrypt } from "@/server/crypto";
import { db } from "@/server/db";
import { audit } from "@/server/notify";
import { assignBooster, completeOrder, markOrderRefunded, OrderError, postOrderMessage } from "@/server/orders";
import { refundPayment, type ProviderId } from "@/server/payments";
import { requireAdmin, requireStaff } from "@/server/session";

const id = z.string().min(1, "Missing order.");

function refresh(orderId: string, number?: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/admin/orders/${orderId}`);
  if (number) revalidatePath(`/orders/${number}`);
}

const REFUNDABLE = ["PAID", "IN_PROGRESS", "DELIVERED", "DISPUTED", "COMPLETED"];

/**
 * Refunds at the provider first, then unwinds the order. Crypto payments are
 * marked refunded with a note: the coins must be sent back by hand.
 */
export async function refundOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const orderId = id.parse(fd.get("id"));
    const reason = z.string().trim().max(500).parse(fd.get("reason") ?? "");
    const order = await db.order.findUnique({ where: { id: orderId }, include: { dispute: true } });
    if (!order) return fail("Order not found.");
    if (!REFUNDABLE.includes(order.status)) return fail("Only paid orders can be refunded.");

    let manual = false;
    try {
      const res = await refundPayment({ paymentProvider: order.paymentProvider as ProviderId | null, paymentIntent: order.paymentIntent });
      if (!res.ok) return fail(res.error);
      manual = res.manual;
    } catch (err) {
      console.error("[admin.refund]", err);
      return fail(`The payment provider refused the refund: ${(err as Error).message ?? "unknown error"}`);
    }

    const note = [reason, manual ? "Crypto refund: send the coins back manually." : ""].filter(Boolean).join(" ");
    await markOrderRefunded(order.id, staff.id, note);
    if (order.dispute?.status === "OPEN") {
      await db.dispute.update({
        where: { id: order.dispute.id },
        data: { status: "RESOLVED_REFUND", resolution: reason || "Refunded from the order page.", resolvedById: staff.id, resolvedAt: new Date() },
      });
    }
    refresh(order.id, order.number);
    return ok(manual ? "Marked refunded. Send the crypto refund manually." : "Refund issued.");
  }, [OrderError]);
}

export async function forceCompleteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const orderId = id.parse(fd.get("id"));
    const order = await db.order.findUnique({ where: { id: orderId }, include: { dispute: true } });
    if (!order) return fail("Order not found.");
    await completeOrder(order.id, { kind: "staff", actorId: staff.id });
    if (order.dispute?.status === "OPEN") {
      await db.dispute.update({
        where: { id: order.dispute.id },
        data: { status: "RESOLVED_RELEASE", resolution: "Completed by staff from the order page.", resolvedById: staff.id, resolvedAt: new Date() },
      });
    }
    refresh(order.id, order.number);
    return ok("Order completed and payment released.");
  }, [OrderError]);
}

export async function assignBoosterAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const orderId = id.parse(fd.get("id"));
    const raw = String(fd.get("boosterId") ?? "");
    const order = await db.order.findUnique({ where: { id: orderId }, select: { number: true, boosterId: true } });
    if (!order) return fail("Order not found.");
    const boosterId = raw || null;
    if (boosterId === order.boosterId) return fail("That booster is already assigned.");
    await assignBooster(orderId, boosterId, staff.id);
    refresh(orderId, order.number);
    return ok(boosterId ? "Booster assigned." : "Order returned to the booster board.");
  }, [OrderError]);
}

export async function cancelOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const orderId = id.parse(fd.get("id"));
    const order = await db.order.findUnique({ where: { id: orderId }, select: { number: true } });
    if (!order) return fail("Order not found.");
    const res = await db.order.updateMany({
      where: { id: orderId, status: "PENDING_PAYMENT" },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (res.count !== 1) return fail("Only unpaid orders can be cancelled. Refund paid orders instead.");
    await db.orderMessage.create({ data: { orderId, kind: "SYSTEM", body: "Staff cancelled this unpaid order." } });
    await audit(staff.id, "order.cancel", "Order", orderId);
    refresh(orderId, order.number);
    return ok("Order cancelled.");
  });
}

export async function staffMessageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const orderId = id.parse(fd.get("id"));
    const body = z.string().trim().min(1, "Write a message first.").max(2000).parse(fd.get("body"));
    const order = await db.order.findUnique({ where: { id: orderId }, select: { number: true } });
    if (!order) return fail("Order not found.");
    await postOrderMessage(orderId, staff, body);
    refresh(orderId, order.number);
    return ok("Message sent.");
  }, [OrderError]);
}

export async function staffNoteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const orderId = id.parse(fd.get("id"));
    const note = z.string().trim().max(2000).parse(fd.get("note") ?? "");
    await db.order.update({ where: { id: orderId }, data: { staffNote: note || null } });
    await audit(staff.id, "order.staff_note", "Order", orderId);
    refresh(orderId);
    return ok("Note saved.");
  });
}

/** Admin-only: decrypts a stored secret on demand. Every reveal is audited. */
export async function revealOrderSecret(orderId: string, field: "accountLogin" | "deliveryNote" | "stock"): Promise<string | null> {
  const admin = await requireAdmin();
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { accountLogin: true, deliveryNote: true, stockItems: { select: { payload: true } } },
  });
  if (!order) return null;
  await audit(admin.id, "order.reveal_secret", "Order", orderId, { field });
  if (field === "stock") {
    const items = order.stockItems.map((s) => decrypt(s.payload)).filter(Boolean);
    return items.length ? items.join("\n\n---\n\n") : null;
  }
  const raw = decrypt(order[field]);
  if (!raw) return null;
  if (field === "accountLogin") {
    try {
      const data = JSON.parse(raw) as Record<string, string>;
      return Object.entries(data)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
    } catch {
      return raw;
    }
  }
  return raw;
}

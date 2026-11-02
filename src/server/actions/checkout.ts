"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, guard, ok, type ActionState } from "@/lib/action";
import { db } from "@/server/db";
import { cancelUnpaidOrder, createBoostOrder, createMarketOrder, markOrderPaid, OrderError, setOrderCoupon } from "@/server/orders";
import { enabledProviders, startCheckout, testPaymentsEnabled, type ProviderId } from "@/server/payments";
import { getCurrentUser, requireUser } from "@/server/session";

function safePath(v: FormDataEntryValue | null, fallback: string) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
}

/** Configurator "Buy boost": creates the order and sends the buyer to checkout. */
export async function startBoostCheckout(_: ActionState, fd: FormData): Promise<ActionState> {
  const returnTo = safePath(fd.get("returnTo"), "/");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);

  let selection: unknown;
  try {
    selection = JSON.parse(String(fd.get("selection") ?? "{}"));
  } catch {
    return fail("Your options couldn't be read. Refresh and try again.");
  }
  const serviceId = String(fd.get("serviceId") ?? "");
  return guard(async () => {
    const order = await createBoostOrder({ buyerId: user.id, serviceId, selection });
    redirect(`/checkout/${order.number}`);
  }, [OrderError]);
}

/** Listing "Buy now". */
export async function startMarketCheckout(_: ActionState, fd: FormData): Promise<ActionState> {
  const returnTo = safePath(fd.get("returnTo"), "/");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  const parsed = z
    .object({ listingId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(100000) })
    .safeParse({ listingId: fd.get("listingId"), quantity: fd.get("quantity") ?? 1 });
  if (!parsed.success) return fail("Choose a valid quantity.");
  return guard(async () => {
    const order = await createMarketOrder({ buyerId: user.id, listingId: parsed.data.listingId, quantity: parsed.data.quantity });
    redirect(`/checkout/${order.number}`);
  }, [OrderError]);
}

async function ownUnpaidOrder(number: string, userId: string) {
  const order = await db.order.findUnique({ where: { number } });
  if (!order || order.buyerId !== userId) throw new OrderError("Order not found.");
  return order;
}

export async function applyCouponAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const number = String(fd.get("number") ?? "");
  const code = String(fd.get("code") ?? "").trim();
  const remove = fd.get("remove") === "1";
  return guard(async () => {
    const order = await ownUnpaidOrder(number, user.id);
    if (!remove && !code) return fail("Enter a code.");
    await setOrderCoupon(order.id, user.id, remove ? null : code);
    redirect(`/checkout/${number}${remove ? "" : "?coupon=1"}`);
  }, [OrderError]);
}

export async function payOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const number = String(fd.get("number") ?? "");
  const provider = String(fd.get("provider") ?? "") as ProviderId;
  if (fd.get("terms") !== "on") return fail("Accept the terms and refund policy to continue.");
  if (!enabledProviders().includes(provider)) return fail("Choose a payment method.");
  let url: string;
  try {
    const order = await ownUnpaidOrder(number, user.id);
    url = await startCheckout(order.id, provider);
  } catch (err) {
    if (err instanceof OrderError) return fail(err.message);
    console.error("[checkout]", err);
    return fail("The payment provider didn't respond. Try again or choose another method.");
  }
  redirect(url);
}

export async function cancelOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const number = String(fd.get("number") ?? "");
  return guard(async () => {
    const order = await ownUnpaidOrder(number, user.id);
    await cancelUnpaidOrder(order.id, user.id);
    redirect(`/orders/${number}`);
  }, [OrderError]);
}

/** Development-only payment simulator (PAYMENTS_TEST_MODE=true). */
export async function simulateTestPaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!testPaymentsEnabled()) return fail("Test payments are disabled.");
  const user = await requireUser();
  const number = String(fd.get("number") ?? "");
  return guard(async () => {
    const order = await ownUnpaidOrder(number, user.id);
    const res = await markOrderPaid(order.id, { provider: "TEST", paymentIntent: `test_${Date.now()}`, amount: order.total, currency: order.currency });
    if (!res.ok) return fail("The simulated payment was rejected.");
    redirect(`/orders/${number}?paid=1`);
  }, [OrderError]);
}

export async function noopAction(): Promise<ActionState> {
  return ok();
}

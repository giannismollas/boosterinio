import { absoluteUrl } from "@/lib/site";
import { db } from "../db";
import { createNowpaymentsInvoice, nowpaymentsEnabled } from "./nowpayments";
import { createPaypalOrder, paypalEnabled, refundPaypal } from "./paypal";
import { createStripeCheckout, refundStripe, stripeEnabled } from "./stripe";

export type ProviderId = "STRIPE" | "PAYPAL" | "NOWPAYMENTS" | "TEST";

export const PROVIDER_INFO: Record<ProviderId, { label: string; description: string }> = {
  STRIPE: { label: "Card", description: "Visa, Mastercard, Apple Pay, Google Pay" },
  PAYPAL: { label: "PayPal", description: "Pay with your PayPal balance or linked card" },
  NOWPAYMENTS: { label: "Crypto", description: "BTC, ETH, USDT, LTC and 100+ coins" },
  TEST: { label: "Test payment", description: "Development only: simulates a successful payment" },
};

export function testPaymentsEnabled() {
  return process.env.PAYMENTS_TEST_MODE === "true";
}

export function enabledProviders(): ProviderId[] {
  const list: ProviderId[] = [];
  if (stripeEnabled()) list.push("STRIPE");
  if (paypalEnabled()) list.push("PAYPAL");
  if (nowpaymentsEnabled()) list.push("NOWPAYMENTS");
  if (testPaymentsEnabled()) list.push("TEST");
  return list;
}

/** Creates the provider-side checkout and returns where to send the buyer. */
export async function startCheckout(orderId: string, provider: ProviderId) {
  if (!enabledProviders().includes(provider)) throw new Error("That payment method isn't available.");
  const order = await db.order.findUnique({ where: { id: orderId }, include: { buyer: { select: { email: true } } } });
  if (!order || order.status !== "PENDING_PAYMENT") throw new Error("This order can't be paid.");

  let result: { url: string; ref: string };
  switch (provider) {
    case "STRIPE":
      result = await createStripeCheckout({ ...order, buyerEmail: order.buyer.email });
      break;
    case "PAYPAL":
      result = await createPaypalOrder(order);
      break;
    case "NOWPAYMENTS":
      result = await createNowpaymentsInvoice(order);
      break;
    case "TEST":
      result = { url: absoluteUrl(`/checkout/${order.number}/test`), ref: `test_${order.id}` };
      break;
  }
  await db.order.update({ where: { id: order.id }, data: { paymentProvider: provider, paymentRef: result.ref } });
  return result.url;
}

/**
 * Refunds the captured payment at the provider. Crypto refunds can't be
 * automated safely (the buyer must give an address), so they are reported as manual.
 */
export async function refundPayment(order: { paymentProvider: ProviderId | null; paymentIntent: string | null }) {
  switch (order.paymentProvider) {
    case "STRIPE":
      if (!order.paymentIntent) return { ok: false as const, error: "Missing Stripe payment reference." };
      await refundStripe(order.paymentIntent);
      return { ok: true as const, manual: false };
    case "PAYPAL":
      if (!order.paymentIntent) return { ok: false as const, error: "Missing PayPal capture reference." };
      await refundPaypal(order.paymentIntent);
      return { ok: true as const, manual: false };
    case "NOWPAYMENTS":
      return { ok: true as const, manual: true };
    case "TEST":
      return { ok: true as const, manual: false };
    default:
      return { ok: false as const, error: "This order has no payment to refund." };
  }
}

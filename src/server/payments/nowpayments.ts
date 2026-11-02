import { createHmac } from "node:crypto";
import { absoluteUrl } from "@/lib/site";
import { safeEqual } from "../crypto";

/*
  NOWPayments hosted invoices. The buyer picks a coin on NOWPayments' page;
  we get an IPN (signed with HMAC-SHA512 over the key-sorted JSON body) when
  the payment status changes. "finished" means the funds reached our wallet.
*/

export function nowpaymentsEnabled() {
  return !!(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_IPN_SECRET);
}

function base() {
  return process.env.NOWPAYMENTS_SANDBOX === "true" ? "https://api-sandbox.nowpayments.io" : "https://api.nowpayments.io";
}

export async function createNowpaymentsInvoice(order: { id: string; number: string; title: string; total: number; currency: string }) {
  const res = await fetch(`${base()}/v1/invoice`, {
    method: "POST",
    headers: { "x-api-key": process.env.NOWPAYMENTS_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: Number((order.total / 100).toFixed(2)),
      price_currency: order.currency.toLowerCase(),
      order_id: order.id,
      order_description: `${order.number} · ${order.title}`.slice(0, 200),
      ipn_callback_url: absoluteUrl("/api/webhooks/nowpayments"),
      success_url: absoluteUrl(`/orders/${order.number}?paid=1`),
      cancel_url: absoluteUrl(`/checkout/${order.number}?cancelled=1`),
    }),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`NOWPayments invoice failed (${res.status}): ${text.slice(0, 300)}`);
  const json = JSON.parse(text) as { id: string | number; invoice_url: string };
  return { url: json.invoice_url, ref: String(json.id) };
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys((value as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return value;
}

export function verifyNowpaymentsSignature(body: unknown, signature: string | null) {
  if (!signature || !process.env.NOWPAYMENTS_IPN_SECRET) return false;
  const expected = createHmac("sha512", process.env.NOWPAYMENTS_IPN_SECRET).update(JSON.stringify(sortKeys(body))).digest("hex");
  return safeEqual(expected, signature);
}

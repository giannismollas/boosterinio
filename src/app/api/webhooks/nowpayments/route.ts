import { db } from "@/server/db";
import { audit } from "@/server/notify";
import { markOrderPaid } from "@/server/orders";
import { nowpaymentsEnabled, verifyNowpaymentsSignature } from "@/server/payments/nowpayments";

type Ipn = {
  payment_id: number | string;
  payment_status: string;
  order_id: string;
  price_amount: number;
  price_currency: string;
  actually_paid?: number;
  pay_currency?: string;
};

// NOWPayments IPN. "finished" = funds received in our wallet.
export async function POST(req: Request) {
  if (!nowpaymentsEnabled()) return new Response("NOWPayments is not configured", { status: 503 });
  const body = (await req.json().catch(() => null)) as Ipn | null;
  if (!body?.order_id) return new Response("Bad request", { status: 400 });
  if (!verifyNowpaymentsSignature(body, req.headers.get("x-nowpayments-sig"))) return new Response("Invalid signature", { status: 400 });

  const eventId = `np_${body.payment_id}_${body.payment_status}`;
  if (await db.paymentEvent.findUnique({ where: { id: eventId } })) return Response.json({ received: true });

  if (body.payment_status === "finished") {
    const res = await markOrderPaid(body.order_id, {
      provider: "NOWPAYMENTS",
      paymentIntent: String(body.payment_id),
      amount: Math.round(Number(body.price_amount) * 100),
      currency: body.price_currency,
    });
    if (!res.ok) await audit(null, "payment.nowpayments_failed", "Order", body.order_id, { reason: res.reason });
  } else if (body.payment_status === "partially_paid") {
    await db.orderMessage
      .create({
        data: {
          orderId: body.order_id,
          kind: "SYSTEM",
          body: `Crypto payment received only partially (${body.actually_paid ?? "?"} ${body.pay_currency ?? ""}). Contact support to complete or refund it.`,
        },
      })
      .catch(() => {});
  }
  await db.paymentEvent.create({ data: { id: eventId, provider: "NOWPAYMENTS", type: body.payment_status, orderId: body.order_id } }).catch(() => {});
  return Response.json({ received: true });
}

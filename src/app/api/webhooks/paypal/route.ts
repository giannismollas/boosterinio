import { db } from "@/server/db";
import { markOrderPaid } from "@/server/orders";
import { capturePaypalOrder, paypalEnabled, verifyPaypalWebhook } from "@/server/payments/paypal";

type PaypalEvent = {
  id: string;
  event_type: string;
  resource: {
    id: string;
    status?: string;
    custom_id?: string;
    amount?: { value: string; currency_code: string };
    purchase_units?: { custom_id?: string }[];
    supplementary_data?: { related_ids?: { order_id?: string } };
  };
};

// PayPal → us. Subscribe to CHECKOUT.ORDER.APPROVED and PAYMENT.CAPTURE.COMPLETED,
// and put the webhook id in PAYPAL_WEBHOOK_ID.
export async function POST(req: Request) {
  if (!paypalEnabled()) return new Response("PayPal is not configured", { status: 503 });
  const event = (await req.json().catch(() => null)) as PaypalEvent | null;
  if (!event?.id) return new Response("Bad request", { status: 400 });
  if (!(await verifyPaypalWebhook(req.headers, event))) return new Response("Invalid signature", { status: 400 });

  const seen = await db.paymentEvent.findUnique({ where: { id: event.id } });
  if (seen) return Response.json({ received: true });

  let orderId: string | null = null;
  if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
    // Buyer approved but may never have returned to the site: capture now.
    orderId = event.resource.purchase_units?.[0]?.custom_id ?? null;
    const capture = await capturePaypalOrder(event.resource.id).catch(() => null);
    if (capture && orderId) {
      await markOrderPaid(orderId, { provider: "PAYPAL", paymentIntent: capture.captureId, amount: capture.amount, currency: capture.currency });
    }
  } else if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    orderId = event.resource.custom_id ?? null;
    if (orderId && event.resource.amount) {
      await markOrderPaid(orderId, {
        provider: "PAYPAL",
        paymentIntent: event.resource.id,
        amount: Math.round(Number(event.resource.amount.value) * 100),
        currency: event.resource.amount.currency_code,
      });
    }
  }
  await db.paymentEvent.create({ data: { id: event.id, provider: "PAYPAL", type: event.event_type, orderId } }).catch(() => {});
  return Response.json({ received: true });
}

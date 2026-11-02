import type Stripe from "stripe";
import { db } from "@/server/db";
import { audit } from "@/server/notify";
import { markOrderPaid } from "@/server/orders";
import { stripe } from "@/server/payments/stripe";

// Stripe → us. Configure the endpoint in the Stripe dashboard with
// checkout.session.completed and checkout.session.async_payment_succeeded.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) return new Response("Stripe is not configured", { status: 503 });

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.warn("[stripe] bad signature", (err as Error).message);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId ?? session.client_reference_id;
    if (orderId && session.payment_status === "paid") {
      const seen = await db.paymentEvent.findUnique({ where: { id: event.id } });
      if (!seen) {
        const res = await markOrderPaid(orderId, {
          provider: "STRIPE",
          paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
          amount: session.amount_total,
          currency: session.currency,
        });
        if (!res.ok && res.reason !== "not_found") await audit(null, "payment.stripe_failed", "Order", orderId, { reason: res.reason });
        await db.paymentEvent.create({ data: { id: event.id, provider: "STRIPE", type: event.type, orderId } }).catch(() => {});
      }
    }
  }

  return Response.json({ received: true });
}

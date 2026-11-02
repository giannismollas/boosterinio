import Stripe from "stripe";
import { absoluteUrl } from "@/lib/site";

let client: Stripe | null = null;

export function stripeEnabled() {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY, { appInfo: { name: "Boosterinio" } });
  return client;
}

export async function createStripeCheckout(order: {
  id: string;
  number: string;
  title: string;
  summary: string | null;
  total: number;
  currency: string;
  buyerEmail: string;
}) {
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    client_reference_id: order.id,
    customer_email: order.buyerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: order.currency.toLowerCase(),
          unit_amount: order.total,
          product_data: {
            name: order.title.slice(0, 250),
            ...(order.summary ? { description: order.summary.slice(0, 500) } : {}),
          },
        },
      },
    ],
    metadata: { orderId: order.id, orderNumber: order.number },
    payment_intent_data: { metadata: { orderId: order.id, orderNumber: order.number } },
    success_url: absoluteUrl(`/orders/${order.number}?paid=1`),
    cancel_url: absoluteUrl(`/checkout/${order.number}?cancelled=1`),
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url, ref: session.id };
}

export async function refundStripe(paymentIntent: string) {
  await stripe().refunds.create({ payment_intent: paymentIntent });
}

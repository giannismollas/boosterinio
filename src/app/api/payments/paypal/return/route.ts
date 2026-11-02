import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { db } from "@/server/db";
import { markOrderPaid } from "@/server/orders";
import { capturePaypalOrder, paypalEnabled } from "@/server/payments/paypal";

// The buyer comes back from PayPal after approving. We capture right away.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order");
  const token = url.searchParams.get("token");
  if (!orderId || !token || !paypalEnabled()) return NextResponse.redirect(absoluteUrl("/dashboard"));

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.redirect(absoluteUrl("/dashboard"));
  if (order.paymentRef !== token) return NextResponse.redirect(absoluteUrl(`/checkout/${order.number}?cancelled=1`));
  if (order.status !== "PENDING_PAYMENT") return NextResponse.redirect(absoluteUrl(`/orders/${order.number}`));

  try {
    const capture = await capturePaypalOrder(token);
    if (!capture) return NextResponse.redirect(absoluteUrl(`/checkout/${order.number}?cancelled=1`));
    await markOrderPaid(order.id, { provider: "PAYPAL", paymentIntent: capture.captureId, amount: capture.amount, currency: capture.currency });
    return NextResponse.redirect(absoluteUrl(`/orders/${order.number}?paid=1`));
  } catch (err) {
    console.error("[paypal] capture failed", err);
    return NextResponse.redirect(absoluteUrl(`/checkout/${order.number}?cancelled=1`));
  }
}

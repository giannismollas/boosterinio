import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { ActionForm, SubmitButton } from "@/components/forms";
import { OrderReceipt } from "@/components/order-receipt";
import { Container } from "@/components/storefront";
import { formatMoney, str } from "@/lib/utils";
import { applyCouponAction, cancelOrderAction } from "@/server/actions/checkout";
import { db } from "@/server/db";
import type { BoostOrderConfig } from "@/server/orders";
import { enabledProviders, PROVIDER_INFO } from "@/server/payments";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

type Props = { params: Promise<{ number: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { number } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/checkout/${number}`);
  const order = await db.order.findUnique({
    where: { number },
    include: { coupon: true, listing: { select: { price: true, unitLabel: true } } },
  });
  if (!order || order.buyerId !== user.id) notFound();
  if (order.status !== "PENDING_PAYMENT") redirect(`/orders/${number}`);

  const providers = enabledProviders().map((id) => ({ id, ...PROVIDER_INFO[id] }));
  const boost = order.type === "BOOST" ? (order.boostConfig as unknown as BoostOrderConfig | null) : null;

  return (
    <Container className="py-10">
      <h1 className="t-display text-5xl text-ink uppercase sm:text-6xl">Checkout</h1>
      <p className="mt-2 text-ink-2">
        Order <span className="font-medium text-ink">{order.number}</span> · {order.gameName}
      </p>

      {str(sp.cancelled) === "1" ? (
        <p className="mt-6 rounded-[12px] border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
          Payment was cancelled. Nothing was charged; you can try again or pick another method.
        </p>
      ) : null}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-8">
          {providers.length ? (
            <section className="panel p-5 sm:p-6">
              <CheckoutForm number={order.number} total={order.total} providers={providers} />
            </section>
          ) : (
            <section className="panel p-6">
              <p className="font-medium text-ink">Payments aren&apos;t switched on yet.</p>
              <p className="mt-1 text-sm text-ink-2">The site owner still needs to connect a payment provider. Your order is saved; come back soon.</p>
            </section>
          )}

          <section className="panel-flat p-5 sm:p-6" aria-labelledby="coupon-h">
            <h2 id="coupon-h" className="text-lg font-semibold text-ink">
              Discount code
            </h2>
            {order.coupon ? (
              <ActionForm action={applyCouponAction} className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <input type="hidden" name="number" value={order.number} />
                <input type="hidden" name="remove" value="1" />
                <p className="text-sm text-ink-2">
                  <span className="chip text-ok">{order.coupon.code}</span> saves you {formatMoney(order.discount)}
                </p>
                <SubmitButton className="btn-ghost btn-sm">Remove</SubmitButton>
              </ActionForm>
            ) : (
              <ActionForm action={applyCouponAction} className="mt-3 flex gap-2">
                <input type="hidden" name="number" value={order.number} />
                <label htmlFor="code" className="sr-only">
                  Discount code
                </label>
                <input id="code" name="code" className="field uppercase" placeholder="Enter code" autoComplete="off" maxLength={40} />
                <SubmitButton className="btn-ghost">Apply</SubmitButton>
              </ActionForm>
            )}
          </section>

          <ActionForm action={cancelOrderAction}>
            <input type="hidden" name="number" value={order.number} />
            <p className="text-sm text-ink-3">
              Changed your mind?{" "}
              <button type="submit" className="text-ink-2 underline underline-offset-4 hover:text-ink">
                Cancel this order
              </button>{" "}
              or{" "}
              <Link href={order.type === "BOOST" ? `/${order.gameSlug}/boosting` : `/${order.gameSlug}`} className="text-ink-2 underline underline-offset-4 hover:text-ink">
                keep browsing
              </Link>
              .
            </p>
          </ActionForm>
        </div>

        <aside className="lg:sticky lg:top-24">
          <OrderReceipt
            title={order.title}
            facts={boost?.facts ?? (order.summary ? [{ label: "Details", value: order.summary }] : undefined)}
            lines={boost?.lines}
            subtotal={order.subtotal}
            discount={order.discount}
            total={order.total}
            quantity={order.quantity}
            unitPrice={order.listing?.price}
          />
          <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-3">
            You&apos;ll finish payment on the provider&apos;s secure page. Your payment is held in escrow and only released after you confirm the order.
          </p>
        </aside>
      </div>
    </Container>
  );
}

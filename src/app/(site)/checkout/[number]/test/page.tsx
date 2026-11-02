import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Container } from "@/components/storefront";
import { formatMoney } from "@/lib/utils";
import { simulateTestPaymentAction } from "@/server/actions/checkout";
import { db } from "@/server/db";
import { testPaymentsEnabled } from "@/server/payments";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Test payment", robots: { index: false, follow: false } };

/** Development payment page. Only reachable when PAYMENTS_TEST_MODE=true. */
export default async function TestPaymentPage({ params }: { params: Promise<{ number: string }> }) {
  if (!testPaymentsEnabled()) notFound();
  const { number } = await params;
  const user = await requireUser(`/checkout/${number}/test`);
  const order = await db.order.findUnique({ where: { number } });
  if (!order || order.buyerId !== user.id) notFound();
  if (order.status !== "PENDING_PAYMENT") redirect(`/orders/${number}`);

  return (
    <Container className="py-16">
      <div className="crt mx-auto max-w-lg p-8 text-center">
        <h1 className="t-display text-5xl text-[#ffffff] uppercase">Simulated payment</h1>
        <span className="chip mt-3 text-warn">Test mode</span>
        <p className="mt-3 text-[#c8c3d0]">
          No real money moves. This page exists because <code className="text-phosphor">PAYMENTS_TEST_MODE</code> is on. Turn it off before going live.
        </p>
        <p className="t-display t-phosphor mt-6 text-6xl tnum">{formatMoney(order.total)}</p>
        <ActionForm action={simulateTestPaymentAction} className="mt-8">
          <input type="hidden" name="number" value={order.number} />
          <SubmitButton className="btn-coin btn-lg w-full" pendingText="Paying…">
            Insert coin · Pay (test)
          </SubmitButton>
        </ActionForm>
      </div>
    </Container>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KV, Numeral, Section, Thread } from "@/components/admin/shared";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHeader, StatusChip } from "@/components/ui";
import { DISPUTE_STATUS, ORDER_STATUS } from "@/lib/catalog";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { resolveDisputeAction } from "@/server/actions/admin/disputes";
import { staffMessageAction } from "@/server/actions/admin/orders";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Dispute" };

export default async function AdminDisputePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const dispute = await db.dispute.findUnique({
    where: { id },
    include: {
      openedBy: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { name: true } },
      order: {
        include: {
          seller: { select: { id: true, displayName: true, completedOrders: true, ratingSum: true, ratingCount: true } },
          booster: { select: { id: true, displayName: true, completedOrders: true, ratingSum: true, ratingCount: true } },
          messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } },
        },
      },
    },
  });
  if (!dispute) notFound();
  const { order } = dispute;
  const earner = order.type === "MARKET" ? order.seller : order.booster;
  const s = DISPUTE_STATUS[dispute.status];
  const open = dispute.status === "OPEN";

  return (
    <>
      <PageHeader
        title={`Dispute · ${order.number}`}
        description={order.title}
        actions={
          <>
            <StatusChip tone={s.tone}>{s.label}</StatusChip>
            <Link href={`/admin/orders/${order.id}`} className="btn btn-ghost btn-sm">
              Open order
            </Link>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Section title={`Buyer's claim: ${dispute.reason}`} description={`Opened ${formatDateTime(dispute.createdAt)} by ${dispute.openedBy.name} (${dispute.openedBy.email})`}>
            <p className="text-sm whitespace-pre-line text-ink">{dispute.details}</p>
          </Section>

          <Section title="Order chat" description="Evidence from both sides. Your messages appear as Staff to the buyer and the seller.">
            <Thread
              messages={order.messages.map((m) => ({
                id: m.id,
                body: m.body,
                createdAt: m.createdAt,
                author: m.sender?.name ?? null,
                kind: m.kind,
                side: m.kind === "STAFF" ? "right" : "left",
              }))}
            />
            <ActionForm action={staffMessageAction} resetOnSuccess className="mt-5 space-y-3">
              <input type="hidden" name="id" value={order.id} />
              <label htmlFor="dispute-message" className="label">
                Ask either side for evidence
              </label>
              <textarea id="dispute-message" name="body" required maxLength={2000} className="field" placeholder="e.g. Please share a screenshot of the account's rank page." />
              <div className="flex justify-end">
                <SubmitButton className="btn-p2" pendingText="Sending…">
                  Send message
                </SubmitButton>
              </div>
            </ActionForm>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="At stake">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-sm text-ink-3">Buyer paid</span>
              <Numeral className="text-[2.4rem] text-ink">{formatMoney(order.total, order.currency)}</Numeral>
            </div>
            <KV
              items={[
                ["Order status", ORDER_STATUS[order.status].label],
                ["Status before dispute", ORDER_STATUS[dispute.previousStatus].label],
                [order.type === "MARKET" ? "Seller earns" : "Booster earns", formatMoney(order.payoutAmount, order.currency)],
                [
                  order.type === "MARKET" ? "Seller" : "Booster",
                  earner ? (
                    <Link key="e" href={`/admin/applications/${earner.id}`} className="text-phosphor hover:underline">
                      {earner.displayName} · {earner.completedOrders} completed
                    </Link>
                  ) : (
                    "None assigned"
                  ),
                ],
                ["Paid with", order.paymentProvider ?? "—"],
              ]}
            />
          </Section>

          {open ? (
            <Section title="Resolve" description="Your note is sent to the buyer and the seller.">
              <ActionForm action={resolveDisputeAction} className="space-y-4">
                <input type="hidden" name="id" value={dispute.id} />
                <fieldset className="space-y-2">
                  <legend className="label">Outcome</legend>
                  {[
                    { v: "refund", t: "Refund the buyer", d: "Refunds the payment and reverses the seller's escrow." },
                    { v: "release", t: "Release to the seller", d: "Completes the order and pays the seller or booster." },
                    { v: "reopen", t: "Close dispute, resume order", d: `Returns the order to "${ORDER_STATUS[dispute.previousStatus].label}".` },
                  ].map((o) => (
                    <label key={o.v} className="flex cursor-pointer gap-3 rounded-[10px] border border-cab-4 bg-cab-3 p-3 has-[:checked]:border-phosphor-dim">
                      <input type="radio" name="outcome" value={o.v} required className="mt-1 accent-[#ff2e88]" />
                      <span>
                        <span className="block text-sm font-medium text-ink">{o.t}</span>
                        <span className="block text-[0.8125rem] text-ink-3">{o.d}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <div>
                  <label htmlFor="resolution-note" className="label">
                    Decision note
                  </label>
                  <textarea id="resolution-note" name="note" maxLength={1000} className="field min-h-24" placeholder="Explain what you found and why you decided this way." />
                </div>
                {order.paymentProvider === "NOWPAYMENTS" ? (
                  <p className="text-[0.8125rem] text-warn">Paid in crypto: a refund must be sent manually after you resolve.</p>
                ) : null}
                <SubmitButton className="btn-coin w-full" pendingText="Resolving…">
                  Resolve dispute
                </SubmitButton>
              </ActionForm>
            </Section>
          ) : (
            <Section title="Resolution">
              <KV
                items={[
                  ["Outcome", s.label],
                  ["Resolved by", dispute.resolvedBy?.name],
                  ["Resolved at", dispute.resolvedAt ? formatDateTime(dispute.resolvedAt) : null],
                  ["Note", dispute.resolution],
                ]}
              />
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

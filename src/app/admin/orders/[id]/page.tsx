import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RevealSecret } from "@/components/admin/reveal-secret";
import { KV, Numeral, Section, Thread } from "@/components/admin/shared";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { PageHeader, StatusChip } from "@/components/ui";
import { DISPUTE_STATUS, ORDER_STATUS } from "@/lib/catalog";
import { formatDateTime, formatMoney } from "@/lib/utils";
import {
  assignBoosterAction,
  cancelOrderAction,
  forceCompleteAction,
  refundOrderAction,
  staffMessageAction,
  staffNoteAction,
} from "@/server/actions/admin/orders";
import { db } from "@/server/db";
import type { BoostProgress } from "@/server/orders";
import { requireStaff } from "@/server/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const order = await db.order.findUnique({ where: { id }, select: { number: true } });
  return { title: order ? `Order ${order.number}` : "Order" };
}

const PROVIDER_LABEL: Record<string, string> = { STRIPE: "Stripe", PAYPAL: "PayPal", NOWPAYMENTS: "NOWPayments (crypto)", TEST: "Test payment" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, name: true, email: true, banned: true } },
      seller: { select: { id: true, displayName: true, slug: true, user: { select: { email: true } } } },
      booster: { select: { id: true, displayName: true, slug: true, user: { select: { email: true } } } },
      listing: { select: { id: true, slug: true, title: true, deliveryMethod: true } },
      service: { select: { id: true, name: true } },
      coupon: { select: { code: true } },
      dispute: { select: { id: true, status: true, reason: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } },
      tickets: { select: { id: true, number: true, subject: true, status: true } },
      _count: { select: { stockItems: true } },
    },
  });
  if (!order) notFound();

  const isAdmin = staff.role === "ADMIN";
  const status = ORDER_STATUS[order.status];
  const config = order.boostConfig as { facts?: { label: string; value: string }[]; etaHours?: number } | null;
  const progress = order.boostProgress as BoostProgress | null;
  const earner = order.type === "MARKET" ? order.seller : order.booster;
  const boosters =
    order.type === "BOOST" && ["PAID", "IN_PROGRESS"].includes(order.status)
      ? await db.sellerProfile.findMany({
          where: { status: "APPROVED", canBoost: true },
          select: { id: true, displayName: true, peakRank: true },
          orderBy: { displayName: "asc" },
        })
      : [];
  const refundable = ["PAID", "IN_PROGRESS", "DELIVERED", "DISPUTED", "COMPLETED"].includes(order.status);
  const completable = ["PAID", "IN_PROGRESS", "DELIVERED", "DISPUTED"].includes(order.status) && !!earner;
  const needsBooster = order.type === "BOOST" && order.status === "PAID" && !order.boosterId;

  const timeline: [string, React.ReactNode][] = [
    ["Created", formatDateTime(order.createdAt)],
    ["Paid", order.paidAt ? formatDateTime(order.paidAt) : null],
    ["Started", order.startedAt ? formatDateTime(order.startedAt) : null],
    ["Delivered", order.deliveredAt ? formatDateTime(order.deliveredAt) : null],
    ["Auto-completes", order.autoCompleteAt ? formatDateTime(order.autoCompleteAt) : null],
    ["Completed", order.completedAt ? formatDateTime(order.completedAt) : null],
  ];
  if (order.refundedAt) timeline.push(["Refunded", formatDateTime(order.refundedAt)]);
  if (order.cancelledAt) timeline.push(["Cancelled", formatDateTime(order.cancelledAt)]);

  return (
    <>
      <PageHeader
        title={order.number}
        description={order.title}
        actions={
          <>
            <StatusChip tone={status.tone}>{status.label}</StatusChip>
            {order.dispute?.status === "OPEN" ? (
              <Link href={`/admin/disputes/${order.dispute.id}`} className="btn btn-coin btn-sm">
                Resolve dispute
              </Link>
            ) : null}
            <Link href={`/orders/${order.number}`} className="btn btn-ghost btn-sm">
              Public order page <ExternalLink className="size-3.5" />
            </Link>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Section title="Summary">
            <div className="grid gap-6 md:grid-cols-2">
              <KV
                items={[
                  ["Type", order.type === "BOOST" ? "Boosting" : "Marketplace"],
                  ["Game", order.gameName],
                  [
                    order.type === "BOOST" ? "Service" : "Listing",
                    order.type === "BOOST" ? (
                      (order.service?.name ?? "Deleted service")
                    ) : order.listing ? (
                      <Link key="l" href={`/admin/listings/${order.listing.id}`} className="text-phosphor hover:underline">
                        {order.listing.title}
                      </Link>
                    ) : (
                      "Deleted listing"
                    ),
                  ],
                  ["Summary", order.summary],
                  ...(order.type === "MARKET"
                    ? ([
                        ["Quantity", order.quantity],
                        [
                          "Delivery",
                          order.listing
                            ? `${order.listing.deliveryMethod === "INSTANT" ? "Instant" : "Manual"}${order._count.stockItems ? ` · ${order._count.stockItems} stock item(s) delivered` : ""}`
                            : null,
                        ],
                      ] as [string, React.ReactNode][])
                    : []),
                ]}
              />
              <KV items={timeline} />
            </div>
          </Section>

          {order.type === "BOOST" ? (
            <Section title="Boost details" description={config?.etaHours ? `Estimated ${Math.round(config.etaHours)} hours of play` : undefined}>
              <div className="grid gap-6 md:grid-cols-2">
                <KV items={(config?.facts ?? []).map((f) => [f.label, f.value] as [string, React.ReactNode])} />
                <KV
                  items={[
                    ["Current rank", progress?.currentRank],
                    ["Wins / losses", progress && (progress.wins !== undefined || progress.losses !== undefined) ? `${progress.wins ?? 0}W / ${progress.losses ?? 0}L` : null],
                    ["Paused by buyer", progress?.paused ? <StatusChip tone="warn">Paused</StatusChip> : "No"],
                    ["Last update", progress?.updatedAt ? formatDateTime(progress.updatedAt) : null],
                    ["Booster note", progress?.note],
                  ]}
                />
              </div>
            </Section>
          ) : null}

          <Section title="Order chat" description="Everyone on the order sees staff messages. Messages you send appear as Staff.">
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
              <label htmlFor="staff-message" className="label">
                Message as staff
              </label>
              <textarea id="staff-message" name="body" required maxLength={2000} className="field" placeholder="Ask for evidence, give an update, or explain a decision…" />
              <div className="flex justify-end">
                <SubmitButton className="btn-p2" pendingText="Sending…">
                  Send message
                </SubmitButton>
              </div>
            </ActionForm>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Money">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-sm text-ink-3">Paid by buyer</span>
              <Numeral className="text-[2.4rem] text-ink">{formatMoney(order.total, order.currency)}</Numeral>
            </div>
            <KV
              items={[
                ["Subtotal", formatMoney(order.subtotal, order.currency)],
                ["Discount", order.discount ? `−${formatMoney(order.discount, order.currency)}${order.coupon ? ` (${order.coupon.code})` : ""}` : null],
                [order.type === "MARKET" ? "Seller earns" : "Booster earns", order.paidAt ? formatMoney(order.payoutAmount, order.currency) : "Set at payment"],
                ["Platform keeps", order.paidAt ? formatMoney(order.platformFee, order.currency) : "Set at payment"],
              ]}
            />
          </Section>

          <Section title="Payment">
            <KV
              items={[
                ["Provider", order.paymentProvider ? PROVIDER_LABEL[order.paymentProvider] : null],
                ["Checkout ref", order.paymentRef ? <code className="text-[0.8125rem] break-all">{order.paymentRef}</code> : null],
                ["Payment ref", order.paymentIntent ? <code className="text-[0.8125rem] break-all">{order.paymentIntent}</code> : null],
                ["Paid at", order.paidAt ? formatDateTime(order.paidAt) : null],
              ]}
            />
          </Section>

          <Section title="People">
            <KV
              items={[
                [
                  "Buyer",
                  <span key="b">
                    <Link href={`/admin/users/${order.buyer.id}`} className="text-phosphor hover:underline">
                      {order.buyer.name}
                    </Link>
                    <span className="block text-[0.8125rem] text-ink-3">{order.buyer.email}</span>
                    {order.buyer.banned ? <StatusChip tone="bad" className="mt-1">Banned</StatusChip> : null}
                  </span>,
                ],
                [
                  order.type === "MARKET" ? "Seller" : "Booster",
                  earner ? (
                    <span key="e">
                      <Link href={`/admin/applications/${earner.id}`} className="text-phosphor hover:underline">
                        {earner.displayName}
                      </Link>
                      <span className="block text-[0.8125rem] text-ink-3">{earner.user.email}</span>
                    </span>
                  ) : order.type === "BOOST" ? (
                    "Not claimed yet"
                  ) : null,
                ],
                [
                  "Dispute",
                  order.dispute ? (
                    <Link key="d" href={`/admin/disputes/${order.dispute.id}`} className="text-phosphor hover:underline">
                      {DISPUTE_STATUS[order.dispute.status].label} · {order.dispute.reason}
                    </Link>
                  ) : null,
                ],
                [
                  "Tickets",
                  order.tickets.length ? (
                    <span key="t" className="flex flex-col gap-1">
                      {order.tickets.map((t) => (
                        <Link key={t.id} href={`/admin/tickets/${t.id}`} className="text-phosphor hover:underline">
                          #{t.number} {t.subject}
                        </Link>
                      ))}
                    </span>
                  ) : null,
                ],
              ]}
            />
          </Section>

          {order.type === "BOOST" && boosters.length ? (
            <Section title={order.boosterId ? "Reassign booster" : "Assign booster"} description="Moves the escrow hold to the new booster.">
              <ActionForm action={assignBoosterAction} className="flex flex-col gap-3">
                <input type="hidden" name="id" value={order.id} />
                <select name="boosterId" defaultValue={order.boosterId ?? ""} className="field" aria-label="Booster">
                  <option value="">No booster (back to the board)</option>
                  {boosters.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.displayName}
                      {b.peakRank ? ` · ${b.peakRank}` : ""}
                    </option>
                  ))}
                </select>
                <SubmitButton className={needsBooster ? "btn-coin" : "btn-ghost"} pendingText="Saving…">
                  {needsBooster ? "Assign booster" : "Update booster"}
                </SubmitButton>
              </ActionForm>
            </Section>
          ) : null}

          <Section title="Staff actions">
            <div className="space-y-5">
              {completable ? (
                <ActionForm action={forceCompleteAction}>
                  <input type="hidden" name="id" value={order.id} />
                  <p className="mb-2 text-[0.8125rem] text-ink-3">Completes the order and releases {formatMoney(order.payoutAmount, order.currency)} to the {order.type === "MARKET" ? "seller" : "booster"}.</p>
                  <ConfirmButton className="btn-ghost w-full" message={`Complete ${order.number} and release payment?`}>
                    Complete &amp; release payment
                  </ConfirmButton>
                </ActionForm>
              ) : null}

              {refundable ? (
                <ActionForm action={refundOrderAction} className="space-y-2">
                  <input type="hidden" name="id" value={order.id} />
                  <label htmlFor="refund-reason" className="label">
                    Refund reason (shown to the buyer)
                  </label>
                  <input id="refund-reason" name="reason" maxLength={500} className="field" placeholder="e.g. Seller couldn't deliver" />
                  {order.paymentProvider === "NOWPAYMENTS" ? (
                    <p className="text-[0.8125rem] text-warn">Crypto payments can&apos;t be refunded automatically. Send the coins back yourself after marking it refunded.</p>
                  ) : null}
                  <ConfirmButton className="btn-danger w-full" message={`Refund ${formatMoney(order.total, order.currency)} for ${order.number}? This can't be undone.`}>
                    Refund {formatMoney(order.total, order.currency)}
                  </ConfirmButton>
                </ActionForm>
              ) : null}

              {order.status === "PENDING_PAYMENT" ? (
                <ActionForm action={cancelOrderAction}>
                  <input type="hidden" name="id" value={order.id} />
                  <ConfirmButton className="btn-danger w-full" message={`Cancel unpaid order ${order.number}?`}>
                    Cancel unpaid order
                  </ConfirmButton>
                </ActionForm>
              ) : null}

              {!completable && !refundable && order.status !== "PENDING_PAYMENT" ? <p className="text-sm text-ink-3">No actions available for a {status.label.toLowerCase()} order.</p> : null}
            </div>
          </Section>

          {isAdmin ? (
            <Section title="Sensitive data" description="Decrypted on request. Every reveal is written to the audit log.">
              <div className="space-y-3">
                {order.type === "BOOST" ? <RevealSecret orderId={order.id} field="accountLogin" label="account login" /> : null}
                {order.type === "MARKET" ? <RevealSecret orderId={order.id} field="deliveryNote" label="delivery note" /> : null}
                {order.type === "MARKET" && order._count.stockItems ? <RevealSecret orderId={order.id} field="stock" label="delivered stock" /> : null}
              </div>
            </Section>
          ) : null}

          <Section title="Staff note" description="Only staff can see this.">
            <ActionForm action={staffNoteAction} className="space-y-3">
              <input type="hidden" name="id" value={order.id} />
              <textarea name="note" defaultValue={order.staffNote ?? ""} maxLength={2000} className="field min-h-24" aria-label="Staff note" placeholder="Context for the next person who opens this order" />
              <SubmitButton className="btn-ghost w-full" pendingText="Saving…">
                Save note
              </SubmitButton>
            </ActionForm>
          </Section>
        </div>
      </div>
    </>
  );
}

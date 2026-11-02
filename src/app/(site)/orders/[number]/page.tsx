import { ArrowRight, LifeBuoy, Pause, Play, Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, FieldError, SubmitButton } from "@/components/forms";
import { AutoRefresh, ChatScroller, RatingInput, Secret } from "@/components/order/client";
import { OrderReceipt } from "@/components/order-receipt";
import { Container } from "@/components/storefront";
import { Avatar, Stars, StatusChip } from "@/components/ui";
import { formatEta } from "@/lib/boosting/engine";
import { DISPUTE_REASONS, ORDER_STATUS } from "@/lib/catalog";
import { listingUrl, sellerUrl } from "@/lib/urls";
import { cn, formatDateTime, formatMoney, str } from "@/lib/utils";
import {
  boostProgressAction,
  confirmOrderAction,
  deliverOrderAction,
  leaveReviewAction,
  openDisputeAction,
  pauseBoostAction,
  sendMessageAction,
  setBoostLoginAction,
  setDuoInfoAction,
} from "@/server/actions/orders";
import { decrypt } from "@/server/crypto";
import { db } from "@/server/db";
import type { BoostOrderConfig, BoostProgress } from "@/server/orders";
import { getSettings } from "@/server/settings";
import { isStaff, requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Order", robots: { index: false, follow: false } };

type Props = { params: Promise<{ number: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { number } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/orders/${number}`);
  const order = await db.order.findUnique({
    where: { number },
    include: {
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, userId: true, displayName: true, slug: true, avatarUrl: true } },
      booster: { select: { id: true, userId: true, displayName: true, slug: true, avatarUrl: true, peakRank: true } },
      listing: { select: { slug: true, category: true, price: true, unitLabel: true, deliveryMethod: true, game: { select: { slug: true } } } },
      messages: { orderBy: { createdAt: "asc" }, take: 300, include: { sender: { select: { id: true, name: true } } } },
      stockItems: { select: { id: true, payload: true } },
      review: true,
      dispute: true,
    },
  });
  if (!order) notFound();

  const staff = isStaff(user);
  const isBuyer = order.buyerId === user.id;
  const isSeller = order.type === "MARKET" && !!user.sellerProfile && user.sellerProfile.id === order.sellerId;
  const isBooster = order.type === "BOOST" && !!user.sellerProfile && user.sellerProfile.id === order.boosterId;
  if (!isBuyer && !isSeller && !isBooster && !staff) notFound();

  const settings = await getSettings();
  const status = ORDER_STATUS[order.status];
  const boost = order.type === "BOOST" ? (order.boostConfig as unknown as BoostOrderConfig | null) : null;
  const progress = (order.boostProgress as BoostProgress | null) ?? null;
  const mode = (boost?.selection as { mode?: string } | undefined)?.mode ?? "solo";
  const login = order.accountLogin ? (JSON.parse(decrypt(order.accountLogin) ?? "{}") as { login?: string; password?: string; summonerName?: string; notes?: string }) : null;
  const delivered = ["DELIVERED", "COMPLETED", "DISPUTED"].includes(order.status) || (order.stockItems.length > 0 && order.status !== "REFUNDED");
  const deliveryNote = decrypt(order.deliveryNote);
  const earner = order.type === "MARKET" ? order.seller : order.booster;
  const active = ["PAID", "IN_PROGRESS", "DELIVERED"].includes(order.status);

  return (
    <Container className="py-10">
      {["PAID", "IN_PROGRESS", "DELIVERED", "DISPUTED", "PENDING_PAYMENT"].includes(order.status) ? <AutoRefresh /> : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-ink-3">
            <Link href={isBuyer ? "/dashboard" : order.type === "BOOST" ? "/seller/boosts" : "/seller/orders"} className="hover:text-ink">
              {isBuyer ? "My orders" : "Dashboard"}
            </Link>{" "}
            / {order.number}
          </p>
          <h1 className="mt-2 text-2xl leading-snug font-semibold text-ink sm:text-3xl">{order.title}</h1>
          <p className="mt-1.5 text-sm text-ink-3">
            {order.gameName} · placed {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip tone={status.tone} className="h-8 px-3 text-xs">
            {status.label}
          </StatusChip>
          {staff ? (
            <Link href={`/admin/orders/${order.id}`} className="btn btn-ghost btn-sm">
              <Shield className="size-4" />
              Admin view
            </Link>
          ) : null}
        </div>
      </div>

      {str(sp.paid) === "1" && order.status === "PENDING_PAYMENT" ? (
        <Banner tone="info">Confirming your payment with the provider. This page refreshes on its own; it usually takes a few seconds.</Banner>
      ) : str(sp.paid) === "1" && order.paidAt ? (
        <Banner tone="ok">Payment received. {order.type === "BOOST" ? "Your order is on the booster board." : "The seller has been notified."}</Banner>
      ) : null}
      <Banner tone="muted">
        {nextStep({ status: order.status, type: order.type, isBuyer, isSeller, isBooster, hasLogin: !!login, mode, autoCompleteAt: order.autoCompleteAt, hours: settings.autoCompleteHours })}
      </Banner>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          {/* Boost HUD: calm instruments, value + trend. */}
          {boost ? (
            <section className="panel p-5 sm:p-6" aria-labelledby="hud-h">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="hud-h" className="t-display text-[1.75rem] text-ink uppercase">
                  Progress
                </h2>
                {progress?.paused ? (
                  <StatusChip tone="warn">Paused by buyer</StatusChip>
                ) : order.status === "IN_PROGRESS" ? (
                  <StatusChip tone="p2">Booster playing</StatusChip>
                ) : null}
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-cab-4 bg-cab-4 sm:grid-cols-4">
                <Gauge label="Current rank" value={progress?.currentRank ?? boost.facts.find((f) => f.label === "Current rank")?.value ?? "—"} />
                <Gauge label="Wins" value={String(progress?.wins ?? 0)} tone="ok" />
                <Gauge label="Losses" value={String(progress?.losses ?? 0)} />
                <Gauge label="Estimate" value={formatEta(boost.etaHours)} />
              </dl>
              {progress?.updatedAt ? <p className="mt-3 text-[0.8125rem] text-ink-3">Last update {formatDateTime(progress.updatedAt)}</p> : null}
              {order.booster ? (
                <p className="mt-4 flex items-center gap-2.5 text-sm text-ink-2">
                  <Avatar name={order.booster.displayName} src={order.booster.avatarUrl} size={28} />
                  Booster: <span className="text-ink">{order.booster.displayName}</span>
                  {order.booster.peakRank ? <span className="text-ink-3">· peak {order.booster.peakRank}</span> : null}
                </p>
              ) : order.status === "PAID" ? (
                <p className="mt-4 text-sm text-ink-3">Waiting for a booster to claim this order.</p>
              ) : null}

              {isBooster && order.status === "IN_PROGRESS" ? (
                <ActionForm action={boostProgressAction} className="mt-6 grid gap-3 border-t border-cab-4 pt-5 sm:grid-cols-[1.4fr_repeat(2,minmax(0,0.6fr))]">
                  <input type="hidden" name="number" value={order.number} />
                  <div>
                    <label className="label" htmlFor="p-rank">
                      Current rank
                    </label>
                    <input id="p-rank" name="currentRank" className="field" placeholder="Gold III 40 LP" defaultValue={progress?.currentRank} />
                  </div>
                  <div>
                    <label className="label" htmlFor="p-w">
                      Wins
                    </label>
                    <input id="p-w" name="wins" type="number" min={0} className="field tnum" defaultValue={progress?.wins ?? 0} />
                  </div>
                  <div>
                    <label className="label" htmlFor="p-l">
                      Losses
                    </label>
                    <input id="p-l" name="losses" type="number" min={0} className="field tnum" defaultValue={progress?.losses ?? 0} />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="label" htmlFor="p-note">
                      Note for the buyer (optional)
                    </label>
                    <input id="p-note" name="note" className="field" maxLength={500} placeholder="Promoted to Gold III, playing again tonight." />
                  </div>
                  <div className="sm:col-span-3">
                    <SubmitButton className="btn-p2">Post update</SubmitButton>
                  </div>
                </ActionForm>
              ) : null}
            </section>
          ) : null}

          {/* Account access for boosts */}
          {boost && (isBuyer || isBooster) && !["COMPLETED", "REFUNDED", "CANCELLED"].includes(order.status) ? (
            <section className="panel p-5 sm:p-6" aria-labelledby="acc-h">
              <h2 id="acc-h" className="t-display text-[1.75rem] text-ink uppercase">
                {mode === "duo" ? "Your in-game name" : "Account access"}
              </h2>
              {isBuyer ? (
                mode === "duo" ? (
                  <ActionForm action={setDuoInfoAction} className="mt-4 space-y-3">
                      <>
                        <input type="hidden" name="number" value={order.number} />
                        <p className="text-sm text-ink-2">Duo boosts never need your password. Tell your booster where to find you.</p>
                        <div>
                          <label className="label" htmlFor="duo-name">
                            Riot ID
                          </label>
                          <input id="duo-name" name="summonerName" className="field" placeholder="Name#TAG" defaultValue={login?.summonerName} required />
                          <FieldError name="summonerName" />
                        </div>
                        <div>
                          <label className="label" htmlFor="duo-notes">
                            When can you play? (optional)
                          </label>
                          <input id="duo-notes" name="notes" className="field" defaultValue={login?.notes} placeholder="Weekdays after 19:00 CET" />
                        </div>
                        <SubmitButton className="btn-p2">{login ? "Update" : "Save"}</SubmitButton>
                      </>
                  </ActionForm>
                ) : (
                  <ActionForm action={setBoostLoginAction} className="mt-4 space-y-3">
                    <input type="hidden" name="number" value={order.number} />
                    <p className="text-sm text-ink-2">
                      Encrypted with AES-256 and shown only to your assigned booster while the order is active.
                      {login?.login ? " Your details are saved; re-enter them to update." : ""}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor="acc-login">
                          Login name
                        </label>
                        <input id="acc-login" name="login" className="field" autoComplete="off" defaultValue={login?.login} required />
                      </div>
                      <div>
                        <label className="label" htmlFor="acc-pass">
                          Password
                        </label>
                        <input id="acc-pass" name="password" type="password" className="field" autoComplete="new-password" required />
                      </div>
                    </div>
                    <div>
                      <label className="label" htmlFor="acc-notes">
                        Notes for your booster (optional)
                      </label>
                      <input id="acc-notes" name="notes" className="field" defaultValue={login?.notes} placeholder="Two-factor codes: message me in the chat" />
                    </div>
                    <SubmitButton className="btn-p2">{login?.login ? "Update details" : "Save details"}</SubmitButton>
                  </ActionForm>
                )
              ) : isBooster && order.status === "IN_PROGRESS" ? (
                login ? (
                  <div className="mt-4 space-y-2">
                    <Secret
                      value={[
                        login.login ? `Login: ${login.login}` : null,
                        login.password ? `Password: ${login.password}` : null,
                        login.summonerName ? `Riot ID: ${login.summonerName}` : null,
                        login.notes ? `Notes: ${login.notes}` : null,
                      ]
                        .filter(Boolean)
                        .join("\n")}
                    />
                    {progress?.paused ? <p className="text-sm text-warn">The buyer paused this order. Don&apos;t log in until they resume it.</p> : null}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink-2">The buyer hasn&apos;t added their details yet. Ask in the chat below.</p>
                )
              ) : (
                <p className="mt-3 text-sm text-ink-3">Details unlock when the order is in progress.</p>
              )}
            </section>
          ) : null}

          {/* Market delivery */}
          {order.type === "MARKET" && (isBuyer || isSeller) && (delivered || deliveryNote) ? (
            <section className="panel p-5 sm:p-6" aria-labelledby="del-h">
              <h2 id="del-h" className="t-display text-[1.75rem] text-ink uppercase">
                Delivery
              </h2>
              <div className="mt-4 space-y-4">
                {order.stockItems.map((s, i) => (
                  <div key={s.id}>
                    {order.stockItems.length > 1 ? <p className="mb-1.5 text-[0.8125rem] text-ink-3">Item {i + 1}</p> : null}
                    <Secret value={decrypt(s.payload) ?? "Unable to decrypt. Contact support."} />
                  </div>
                ))}
                {deliveryNote ? <Secret value={deliveryNote} /> : null}
                {isBuyer ? (
                  <p className="text-[0.8125rem] text-ink-3">Change the password and recovery email right away, then confirm the order below.</p>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* Seller delivers a manual market order */}
          {isSeller && ["PAID", "IN_PROGRESS"].includes(order.status) ? (
            <section className="panel p-5 sm:p-6" aria-labelledby="deliver-h">
              <h2 id="deliver-h" className="t-display text-[1.75rem] text-ink uppercase">
                Deliver this order
              </h2>
              <ActionForm action={deliverOrderAction} className="mt-4 space-y-3">
                <input type="hidden" name="number" value={order.number} />
                <label className="label" htmlFor="del-note">
                  Delivery details for the buyer
                </label>
                <textarea
                  id="del-note"
                  name="note"
                  required
                  className="field min-h-32 font-mono text-sm"
                  placeholder={"Login: …\nPassword: …\nOr: trade details, code, meeting point"}
                />
                <p className="text-[0.8125rem] text-ink-3">Encrypted at rest and visible only to the buyer and staff.</p>
                <SubmitButton className="btn-coin">Insert coin · Mark as delivered</SubmitButton>
              </ActionForm>
            </section>
          ) : null}

          {/* Chat */}
          <section className="panel overflow-hidden" aria-labelledby="chat-h">
            <div className="flex items-center justify-between border-b border-cab-4 px-5 py-3.5">
              <h2 id="chat-h" className="t-display text-[1.75rem] text-ink uppercase">
                Order chat
              </h2>
              <span className="text-[0.8125rem] text-ink-3">Never share payment details or move the deal off {`Boosterinio`}.</span>
            </div>
            <ChatScroller count={order.messages.length}>
              {order.messages.map((m) =>
                m.kind === "SYSTEM" ? (
                  <p key={m.id} className="rounded-[8px] bg-crt px-3 py-2 font-mono text-[0.75rem] leading-relaxed text-[#9fcfc6]">
                    <span className="text-phosphor-dim">{formatDateTime(m.createdAt)} ›</span> {m.body}
                  </p>
                ) : (
                  <div key={m.id} className={cn("flex", m.senderId === user.id ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-[12px] px-3.5 py-2.5",
                        m.kind === "STAFF" ? "border border-phosphor/30 bg-[rgb(92_242_214/0.07)]" : m.senderId === user.id ? "bg-p2/25" : "bg-cab-3",
                      )}
                    >
                      <p className="mb-0.5 text-[0.6875rem] text-ink-3">
                        {m.kind === "STAFF"
                          ? `${m.sender?.name ?? "Staff"} · Boosterinio staff`
                          : m.senderId === order.buyerId
                            ? m.senderId === user.id
                              ? "You"
                              : "Buyer"
                            : m.senderId === user.id
                              ? "You"
                              : (earner?.displayName ?? m.sender?.name ?? "Seller")}{" "}
                        · {formatDateTime(m.createdAt)}
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink">{m.body}</p>
                    </div>
                  </div>
                ),
              )}
            </ChatScroller>
            {order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED" ? (
              <ActionForm action={sendMessageAction} resetOnSuccess className="flex gap-2 border-t border-cab-4 p-3">
                <input type="hidden" name="number" value={order.number} />
                <label htmlFor="msg" className="sr-only">
                  Message
                </label>
                <textarea id="msg" name="body" required maxLength={2000} rows={1} className="field min-h-11 flex-1 resize-none py-2.5" placeholder="Write a message…" />
                <SubmitButton className="btn-p2" pendingText="Sending">
                  Send
                </SubmitButton>
              </ActionForm>
            ) : (
              <p className="border-t border-cab-4 p-4 text-sm text-ink-3">Chat opens once the order is paid.</p>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
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

          {(isSeller || isBooster) && order.payoutAmount ? (
            <p className="panel-flat px-4 py-3 text-sm text-ink-2">
              You earn <span className="t-display text-2xl text-ink tnum">{formatMoney(order.payoutAmount)}</span>, released when the buyer confirms.
            </p>
          ) : null}

          {/* Buyer actions */}
          {isBuyer && order.status === "PENDING_PAYMENT" ? (
            <Link href={`/checkout/${order.number}`} className="btn btn-coin btn-lg w-full">
              Insert coin · Pay {formatMoney(order.total)}
            </Link>
          ) : null}

          {isBuyer && order.status === "DELIVERED" ? (
            <ActionForm action={confirmOrderAction} className="panel p-5">
              <input type="hidden" name="number" value={order.number} />
              <p className="text-sm text-ink-2">
                Everything as described? Confirming releases payment to {earner?.displayName ?? "the seller"}.
                {order.autoCompleteAt ? ` Otherwise it completes on its own on ${formatDateTime(order.autoCompleteAt)}.` : ""}
              </p>
              <SubmitButton className="btn-coin btn-lg mt-4 w-full" pendingText="Confirming…">
                Confirm &amp; release payment
              </SubmitButton>
            </ActionForm>
          ) : null}

          {isBuyer && boost && ["PAID", "IN_PROGRESS"].includes(order.status) ? (
            <ActionForm action={pauseBoostAction} className="panel-flat flex items-center justify-between gap-3 p-4">
              <input type="hidden" name="number" value={order.number} />
              <input type="hidden" name="paused" value={progress?.paused ? "0" : "1"} />
              <p className="text-sm text-ink-2">{progress?.paused ? "Boost is paused." : "Want to play yourself?"}</p>
              <SubmitButton className="btn-ghost btn-sm">
                {progress?.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
                {progress?.paused ? "Resume" : "Pause"}
              </SubmitButton>
            </ActionForm>
          ) : null}

          {isBooster && order.status === "IN_PROGRESS" ? (
            <ActionForm action={deliverOrderAction} className="panel p-5">
              <input type="hidden" name="number" value={order.number} />
              <p className="text-sm text-ink-2">Reached the goal? Mark the boost finished; the buyer checks and confirms.</p>
              <SubmitButton className="btn-coin btn-lg mt-4 w-full" pendingText="Saving…">
                Mark boost finished
              </SubmitButton>
            </ActionForm>
          ) : null}

          {isBuyer && order.status === "COMPLETED" && !order.review && earner ? (
            <ActionForm action={leaveReviewAction} className="panel space-y-3 p-5">
                <>
                  <input type="hidden" name="number" value={order.number} />
                  <h2 className="t-display text-2xl text-ink uppercase">Rate {earner.displayName}</h2>
                  <RatingInput />
                  <FieldError name="rating" />
                  <div>
                    <label className="label" htmlFor="rev-c">
                      Comment (optional)
                    </label>
                    <textarea id="rev-c" name="comment" className="field min-h-20" maxLength={1000} />
                  </div>
                  <SubmitButton className="btn-p2">Post review</SubmitButton>
                </>
            </ActionForm>
          ) : null}

          {order.review ? (
            <div className="panel-flat p-4 text-sm">
              <p className="text-ink-3">Your review</p>
              <Stars value={order.review.rating} className="mt-1.5" />
              {order.review.comment ? <p className="mt-1.5 text-ink-2">{order.review.comment}</p> : null}
            </div>
          ) : null}

          {isBuyer && active ? (
            <details className="panel-flat group p-4">
              <summary className="cursor-pointer list-none text-sm text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">Something wrong? Open a dispute</summary>
              <ActionForm action={openDisputeAction} className="mt-4 space-y-3">
                  <>
                    <input type="hidden" name="number" value={order.number} />
                    <p className="text-[0.8125rem] text-ink-3">Funds are frozen while staff review. Try the chat first; most issues are solved there.</p>
                    <select name="reason" className="field" required defaultValue="">
                      <option value="" disabled>
                        What went wrong?
                      </option>
                      {DISPUTE_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <textarea name="details" className="field min-h-24" minLength={20} maxLength={2000} required placeholder="What happened, and what would make it right?" />
                    <FieldError name="_" />
                    <SubmitButton className="btn-danger w-full">Open dispute</SubmitButton>
                  </>
              </ActionForm>
            </details>
          ) : null}

          {order.dispute && order.status === "DISPUTED" ? (
            <div className="panel-flat border-bad/30 p-4 text-sm text-ink-2">
              <p className="font-medium text-bad">Dispute open: {order.dispute.reason}</p>
              <p className="mt-1">Staff are reviewing. Add evidence in the chat; screenshots can be shared through a support ticket.</p>
            </div>
          ) : null}

          {order.listing && order.type === "MARKET" ? (
            <Link
              href={listingUrl({ slug: order.listing.slug, category: order.listing.category, game: order.listing.game })}
              className="flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink"
            >
              View the original listing <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          ) : null}
          {earner && !isSeller && !isBooster && order.type === "MARKET" ? (
            <Link href={sellerUrl(earner.slug)} className="flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink">
              Seller: {earner.displayName} <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          ) : null}

          <Link href={`/dashboard/tickets/new?order=${order.number}`} className="btn btn-ghost w-full">
            <LifeBuoy className="size-4" />
            Get help with this order
          </Link>
        </aside>
      </div>
    </Container>
  );
}

function Gauge({ label, value, tone }: { label: string; value: string; tone?: "ok" }) {
  return (
    <div className="bg-cab-2 px-4 py-3.5">
      <dt className="text-[0.75rem] text-ink-3">{label}</dt>
      <dd className={cn("t-display mt-0.5 text-2xl leading-none break-words tnum sm:text-3xl", tone === "ok" ? "text-ok" : "text-ink")}>{value}</dd>
    </div>
  );
}

function Banner({ tone, children }: { tone: "ok" | "info" | "muted"; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      className={cn(
        "mt-5 rounded-[12px] border px-4 py-3 text-sm",
        tone === "ok" && "border-ok/30 bg-ok/5 text-ok",
        tone === "info" && "border-phosphor/30 bg-phosphor/5 text-phosphor",
        tone === "muted" && "border-cab-4 bg-cab-2 text-ink-2",
      )}
    >
      {children}
    </p>
  );
}

function nextStep(o: {
  status: string;
  type: string;
  isBuyer: boolean;
  isSeller: boolean;
  isBooster: boolean;
  hasLogin: boolean;
  mode: string;
  autoCompleteAt: Date | null;
  hours: number;
}): string | null {
  if (o.isBuyer) {
    switch (o.status) {
      case "PENDING_PAYMENT":
        return "This order isn't paid yet. Pay to start it, or cancel it from checkout.";
      case "PAID":
        return o.type === "BOOST"
          ? o.hasLogin
            ? "Paid. A booster will claim your order shortly."
            : o.mode === "duo"
              ? "Paid. Add your Riot ID below so your booster can invite you."
              : "Paid. Add your account details below so your booster can start."
          : "Paid. The seller has been notified and will deliver here.";
      case "IN_PROGRESS":
        return o.type === "BOOST" ? "Your booster is working on it. Follow progress and chat below." : "The seller is preparing your delivery.";
      case "DELIVERED":
        return `Delivered. Check it and confirm, or open a dispute. It completes automatically after ${o.hours} hours.`;
      case "COMPLETED":
        return "Completed. Thanks for playing on Boosterinio.";
      case "DISPUTED":
        return "Disputed. Staff are reviewing; funds are frozen until they decide.";
      default:
        return ORDER_STATUS[o.status]?.help ?? null;
    }
  }
  if (o.isSeller) {
    if (o.status === "PAID" || o.status === "IN_PROGRESS") return "The buyer paid. Deliver the item and post the details below.";
    if (o.status === "DELIVERED") return "Delivered. Payment is released when the buyer confirms or the protection window ends.";
  }
  if (o.isBooster) {
    if (o.status === "IN_PROGRESS") return "Play the games, post progress updates, and mark the boost finished at the goal.";
    if (o.status === "DELIVERED") return "Finished. Payment is released when the buyer confirms or the protection window ends.";
  }
  return ORDER_STATUS[o.status]?.help ?? null;
}

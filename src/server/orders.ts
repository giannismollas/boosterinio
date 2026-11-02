import { quoteService, type CalculatorKind, type Quote } from "@/lib/boosting/engine";
import { randomCode } from "@/lib/utils";
import type { Prisma as P } from "@/generated/prisma/client";
import { encrypt } from "./crypto";
import { db } from "./db";
import { audit, notify } from "./notify";
import { getSettings } from "./settings";

/*
  Order life cycle and escrow. Every state change is a conditional update so a
  double click, a retried webhook or two staff members acting at once can't
  apply the same transition twice.

  Escrow: the earning party (seller for market orders, booster for boosts) gets
  `payoutAmount` added to pendingBalance when money is committed to them
  (payment for market orders, claim for boosts) and moved to balance when the
  order completes.
*/

type Tx = P.TransactionClient;

export class OrderError extends Error {}

const ACTIVE_STATUSES = ["PAID", "IN_PROGRESS", "DELIVERED"] as const;

async function newOrderNumber(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const number = `BST-${randomCode(6)}`;
    const exists = await db.order.findUnique({ where: { number }, select: { id: true } });
    if (!exists) return number;
  }
  throw new OrderError("Could not allocate an order number, please retry.");
}

// ───────────────────────── coupons ─────────────────────────

export async function evaluateCoupon(code: string, scope: "BOOST" | "MARKET", subtotal: number) {
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon || !coupon.isActive) return { ok: false as const, error: "This code doesn't exist." };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { ok: false as const, error: "This code has expired." };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return { ok: false as const, error: "This code has been used up." };
  if (coupon.scope !== "ALL" && coupon.scope !== scope)
    return { ok: false as const, error: `This code only works on ${coupon.scope === "BOOST" ? "boosting" : "marketplace"} orders.` };
  if (subtotal < coupon.minOrder) return { ok: false as const, error: "Your order is below this code's minimum." };
  const raw = coupon.type === "PERCENT" ? Math.round((subtotal * Math.min(coupon.value, 100)) / 100) : coupon.value;
  const discount = Math.min(raw, Math.max(0, subtotal - 50));
  return { ok: true as const, coupon, discount };
}

// ───────────────────────── creation ─────────────────────────

export type BoostOrderConfig = {
  selection: unknown;
  facts: Quote["facts"];
  lines: Quote["lines"];
  etaHours: number;
  calculator: CalculatorKind;
};

export async function createBoostOrder(input: { buyerId: string; serviceId: string; selection: unknown }) {
  const service = await db.boostService.findUnique({ where: { id: input.serviceId }, include: { game: true } });
  if (!service || !service.isActive || !service.game.isActive || !service.game.boostingEnabled) {
    throw new OrderError("This service isn't available right now.");
  }
  const result = quoteService({ calculator: service.calculator, config: service.config, name: service.name }, input.selection);
  if (!result.ok) throw new OrderError(result.error);
  const { quote } = result;

  const boostConfig: BoostOrderConfig = {
    selection: input.selection,
    facts: quote.facts,
    lines: quote.lines,
    etaHours: quote.etaHours,
    calculator: service.calculator,
  };

  return db.order.create({
    data: {
      number: await newOrderNumber(),
      type: "BOOST",
      buyerId: input.buyerId,
      serviceId: service.id,
      boostConfig: boostConfig as never,
      title: quote.title,
      summary: quote.summary,
      gameName: service.game.name,
      gameSlug: service.game.slug,
      subtotal: quote.total,
      total: quote.total,
      messages: { create: { kind: "SYSTEM", body: "Order created. Complete payment to send it to the booster board." } },
    },
  });
}

export async function availableStock(listing: { id: string; deliveryMethod: string; stock: number }) {
  if (listing.deliveryMethod === "INSTANT") {
    return db.stockItem.count({ where: { listingId: listing.id, orderId: null } });
  }
  return listing.stock;
}

export async function createMarketOrder(input: { buyerId: string; listingId: string; quantity: number }) {
  const listing = await db.listing.findUnique({
    where: { id: input.listingId },
    include: { seller: true, game: true },
  });
  if (!listing || listing.status !== "ACTIVE") throw new OrderError("This listing is no longer available.");
  if (listing.seller.status !== "APPROVED" || !listing.seller.canSell) throw new OrderError("This seller can't take orders right now.");
  if (listing.seller.userId === input.buyerId) throw new OrderError("You can't buy your own listing.");

  const quantity = Math.max(listing.minQuantity, Math.floor(input.quantity || 1));
  const stock = await availableStock(listing);
  if (quantity > stock) throw new OrderError(stock === 0 ? "This listing is sold out." : `Only ${stock} left in stock.`);

  const subtotal = listing.price * quantity;
  return db.order.create({
    data: {
      number: await newOrderNumber(),
      type: "MARKET",
      buyerId: input.buyerId,
      listingId: listing.id,
      sellerId: listing.sellerId,
      quantity,
      title: listing.title,
      summary: [listing.unitLabel ? `${quantity} × ${listing.unitLabel}` : quantity > 1 ? `${quantity} units` : null, listing.server, listing.platform]
        .filter(Boolean)
        .join(" · ") || null,
      gameName: listing.game.name,
      gameSlug: listing.game.slug,
      subtotal,
      total: subtotal,
      messages: { create: { kind: "SYSTEM", body: "Order created. Complete payment to notify the seller." } },
    },
  });
}

/** Applies or clears a coupon on an unpaid order. */
export async function setOrderCoupon(orderId: string, buyerId: string, code: string | null) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.buyerId !== buyerId) throw new OrderError("Order not found.");
  if (order.status !== "PENDING_PAYMENT") throw new OrderError("This order is already paid.");
  if (!code) {
    await db.order.update({ where: { id: orderId }, data: { couponId: null, discount: 0, total: order.subtotal } });
    return { discount: 0 };
  }
  const res = await evaluateCoupon(code, order.type, order.subtotal);
  if (!res.ok) throw new OrderError(res.error);
  await db.order.update({
    where: { id: orderId },
    data: { couponId: res.coupon.id, discount: res.discount, total: order.subtotal - res.discount },
  });
  return { discount: res.discount };
}

// ───────────────────────── payment ─────────────────────────

function computeSplit(order: { type: string; subtotal: number; total: number }, settings: { marketplaceFeePct: number; boosterPayoutPct: number }) {
  // Coupons are funded by the platform: earnings are based on the undiscounted subtotal.
  const payoutAmount =
    order.type === "MARKET"
      ? order.subtotal - Math.round((order.subtotal * settings.marketplaceFeePct) / 100)
      : Math.round((order.subtotal * settings.boosterPayoutPct) / 100);
  return { payoutAmount, platformFee: order.total - payoutAmount };
}

async function hold(tx: Tx, sellerId: string, amount: number, orderId: string, note: string) {
  await tx.sellerProfile.update({ where: { id: sellerId }, data: { pendingBalance: { increment: amount } } });
  await tx.walletTransaction.create({ data: { sellerId, type: "ESCROW_HOLD", amount, orderId, note } });
}

async function reverseHold(tx: Tx, sellerId: string, amount: number, orderId: string, note: string) {
  await tx.sellerProfile.update({ where: { id: sellerId }, data: { pendingBalance: { decrement: amount } } });
  await tx.walletTransaction.create({ data: { sellerId, type: "ESCROW_REVERSAL", amount: -amount, orderId, note } });
}

/**
 * Marks an order as paid. Safe to call repeatedly (webhooks retry): only the
 * first call for a PENDING_PAYMENT order has an effect.
 */
export async function markOrderPaid(
  orderId: string,
  payment: { provider: "STRIPE" | "PAYPAL" | "NOWPAYMENTS" | "TEST"; paymentIntent?: string | null; amount?: number | null; currency?: string | null },
) {
  const settings = await getSettings();
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { seller: { select: { userId: true } }, listing: true },
  });
  if (!order) return { ok: false as const, reason: "not_found" };
  if (order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED") return { ok: true as const, already: true };
  if (payment.amount != null && payment.amount < order.total) {
    console.error(`[payments] amount mismatch for ${order.number}: got ${payment.amount}, expected ${order.total}`);
    await db.orderMessage.create({
      data: { orderId, kind: "SYSTEM", body: "A payment was received but the amount didn't match. Support has been notified." },
    });
    await audit(null, "payment.amount_mismatch", "Order", orderId, { got: payment.amount, expected: order.total });
    return { ok: false as const, reason: "amount_mismatch" };
  }
  if (payment.currency && payment.currency.toUpperCase() !== order.currency.toUpperCase()) {
    await audit(null, "payment.currency_mismatch", "Order", orderId, { got: payment.currency, expected: order.currency });
    return { ok: false as const, reason: "currency_mismatch" };
  }

  const { payoutAmount, platformFee } = computeSplit(order, settings);
  const now = new Date();
  let instantDelivered = false;

  const applied = await db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, status: { in: ["PENDING_PAYMENT", "CANCELLED"] } },
      data: {
        status: "PAID",
        paidAt: now,
        cancelledAt: null,
        paymentProvider: payment.provider,
        paymentIntent: payment.paymentIntent ?? undefined,
        payoutAmount,
        platformFee,
      },
    });
    if (res.count !== 1) return false;

    if (order.couponId) await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });

    await tx.orderMessage.create({
      data: { orderId, kind: "SYSTEM", body: `Payment received via ${payment.provider === "NOWPAYMENTS" ? "crypto" : payment.provider.toLowerCase()}. Funds are held in escrow until you confirm the order.` },
    });

    if (order.type === "MARKET" && order.listing && order.sellerId) {
      await hold(tx, order.sellerId, payoutAmount, orderId, `Sale ${order.number}`);
      const listing = order.listing;
      if (listing.deliveryMethod === "INSTANT") {
        const items = await tx.stockItem.findMany({
          where: { listingId: listing.id, orderId: null },
          take: order.quantity,
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
        if (items.length === order.quantity) {
          await tx.stockItem.updateMany({ where: { id: { in: items.map((i) => i.id) }, orderId: null }, data: { orderId, deliveredAt: now } });
          await tx.order.update({
            where: { id: orderId },
            data: { status: "DELIVERED", deliveredAt: now, autoCompleteAt: new Date(now.getTime() + settings.autoCompleteHours * 3600_000) },
          });
          await tx.orderMessage.create({
            data: { orderId, kind: "SYSTEM", body: "Delivered instantly. Your item details are on this page. Check them, then confirm the order." },
          });
          instantDelivered = true;
        } else {
          await tx.orderMessage.create({
            data: { orderId, kind: "SYSTEM", body: "Instant stock ran out, so the seller will deliver this order by hand." },
          });
        }
        const remaining = await tx.stockItem.count({ where: { listingId: listing.id, orderId: null } });
        await tx.listing.update({
          where: { id: listing.id },
          data: { soldCount: { increment: order.quantity }, stock: remaining, ...(remaining === 0 ? { status: "SOLD_OUT" } : {}) },
        });
      } else {
        const remaining = Math.max(0, listing.stock - order.quantity);
        await tx.listing.update({
          where: { id: listing.id },
          data: { soldCount: { increment: order.quantity }, stock: remaining, ...(remaining === 0 ? { status: "SOLD_OUT" } : {}) },
        });
      }
    }
    return true;
  });

  if (!applied) return { ok: true as const, already: true };

  await notify(order.buyerId, {
    title: `Payment received for ${order.number}`,
    body: instantDelivered
      ? "Your order was delivered instantly. Open it to see the details."
      : order.type === "BOOST"
        ? "Your boost is on the booster board. You'll be notified when a booster starts."
        : "The seller has been notified and will deliver soon.",
    href: `/orders/${order.number}`,
    email: true,
  });
  if (order.type === "MARKET" && order.seller) {
    await notify(order.seller.userId, {
      title: instantDelivered ? `Sold: ${order.title}` : `New order to deliver: ${order.number}`,
      body: instantDelivered ? "Delivered automatically from your stock." : "A buyer paid for your listing. Deliver it from the order page.",
      href: `/orders/${order.number}`,
      email: !instantDelivered,
    });
  }
  return { ok: true as const };
}

// ───────────────────────── boosting ─────────────────────────

export async function claimBoostOrder(orderId: string, booster: { id: string; userId: string; canBoost: boolean; status: string }) {
  if (booster.status !== "APPROVED" || !booster.canBoost) throw new OrderError("Your booster account isn't approved.");
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.type !== "BOOST") throw new OrderError("Order not found.");
  if (order.buyerId === booster.userId) throw new OrderError("You can't claim your own order.");

  const claimed = await db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, status: "PAID", boosterId: null },
      data: { boosterId: booster.id, status: "IN_PROGRESS", startedAt: new Date() },
    });
    if (res.count !== 1) return false;
    await hold(tx, booster.id, order.payoutAmount, orderId, `Boost ${order.number}`);
    await tx.orderMessage.create({ data: { orderId, kind: "SYSTEM", body: "A booster claimed your order and is getting started." } });
    return true;
  });
  if (!claimed) throw new OrderError("Someone else already claimed this order.");
  await notify(order.buyerId, {
    title: `Your booster is on it: ${order.number}`,
    body: "Say hi in the order chat, and make sure your account details are filled in.",
    href: `/orders/${order.number}`,
    email: true,
  });
}

/** Staff: assign, reassign or unassign the booster on a boost order. */
export async function assignBooster(orderId: string, boosterId: string | null, staffId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.type !== "BOOST") throw new OrderError("Order not found.");
  if (!["PAID", "IN_PROGRESS"].includes(order.status)) throw new OrderError("Only active boosts can be reassigned.");
  if (boosterId) {
    const booster = await db.sellerProfile.findUnique({ where: { id: boosterId } });
    if (!booster || booster.status !== "APPROVED" || !booster.canBoost) throw new OrderError("That booster isn't approved.");
  }
  await db.$transaction(async (tx) => {
    if (order.boosterId) await reverseHold(tx, order.boosterId, order.payoutAmount, orderId, `Unassigned from ${order.number}`);
    if (boosterId) await hold(tx, boosterId, order.payoutAmount, orderId, `Boost ${order.number}`);
    await tx.order.update({
      where: { id: orderId },
      data: { boosterId, status: boosterId ? "IN_PROGRESS" : "PAID", startedAt: boosterId ? new Date() : null },
    });
    await tx.orderMessage.create({
      data: { orderId, kind: "SYSTEM", body: boosterId ? "Staff assigned a booster to this order." : "Staff returned this order to the booster board." },
    });
  });
  await audit(staffId, boosterId ? "order.assign_booster" : "order.unassign_booster", "Order", orderId, { boosterId });
}

export type BoostProgress = { currentRank?: string; wins?: number; losses?: number; note?: string; paused?: boolean; updatedAt?: string };

export async function updateBoostProgress(orderId: string, boosterProfileId: string, progress: BoostProgress) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.boosterId !== boosterProfileId || order.status !== "IN_PROGRESS") throw new OrderError("You can't update this order.");
  const prev = (order.boostProgress as BoostProgress | null) ?? {};
  const next: BoostProgress = { ...prev, ...progress, updatedAt: new Date().toISOString() };
  const parts = [
    progress.currentRank ? `now ${progress.currentRank}` : null,
    progress.wins !== undefined || progress.losses !== undefined ? `${next.wins ?? 0}W / ${next.losses ?? 0}L` : null,
  ].filter(Boolean);
  await db.order.update({
    where: { id: orderId },
    data: {
      boostProgress: next as never,
      messages: parts.length || progress.note ? { create: { kind: "SYSTEM", body: `Progress update: ${[parts.join(", "), progress.note].filter(Boolean).join(" — ")}` } } : undefined,
    },
  });
}

/** Buyer pauses or resumes a boost so they can play themselves. */
export async function setBoostPaused(orderId: string, buyerId: string, paused: boolean) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.buyerId !== buyerId || order.type !== "BOOST" || !["PAID", "IN_PROGRESS"].includes(order.status)) {
    throw new OrderError("You can't pause this order.");
  }
  const prev = (order.boostProgress as BoostProgress | null) ?? {};
  await db.order.update({
    where: { id: orderId },
    data: {
      boostProgress: { ...prev, paused } as never,
      messages: { create: { kind: "SYSTEM", body: paused ? "The buyer paused the boost. Please stop playing until it's resumed." : "The buyer resumed the boost." } },
    },
  });
}

export async function setBoostLogin(orderId: string, buyerId: string, data: { login: string; password: string; summonerName?: string; notes?: string }) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.buyerId !== buyerId || order.type !== "BOOST") throw new OrderError("Order not found.");
  if (!["PENDING_PAYMENT", "PAID", "IN_PROGRESS"].includes(order.status)) throw new OrderError("This order is closed.");
  await db.order.update({
    where: { id: orderId },
    data: {
      accountLogin: encrypt(JSON.stringify(data)),
      messages: { create: { kind: "SYSTEM", body: "The buyer updated the account details." } },
    },
  });
}

// ───────────────────────── delivery & completion ─────────────────────────

/** Seller (market) or booster (boost) marks the work as delivered. */
export async function deliverOrder(orderId: string, actorProfileId: string, note?: string) {
  const settings = await getSettings();
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderError("Order not found.");
  const earner = order.type === "MARKET" ? order.sellerId : order.boosterId;
  if (earner !== actorProfileId) throw new OrderError("You can't deliver this order.");
  const now = new Date();
  const res = await db.order.updateMany({
    where: { id: orderId, status: { in: order.type === "MARKET" ? ["PAID", "IN_PROGRESS"] : ["IN_PROGRESS"] } },
    data: {
      status: "DELIVERED",
      deliveredAt: now,
      autoCompleteAt: new Date(now.getTime() + settings.autoCompleteHours * 3600_000),
      ...(note ? { deliveryNote: encrypt(note) } : {}),
    },
  });
  if (res.count !== 1) throw new OrderError("This order can't be marked as delivered now.");
  await db.orderMessage.create({
    data: {
      orderId,
      kind: "SYSTEM",
      body:
        order.type === "BOOST"
          ? `The booster marked the boost as finished. Check your account, then confirm. It completes automatically in ${settings.autoCompleteHours} hours.`
          : `The seller marked the order as delivered. Check it, then confirm. It completes automatically in ${settings.autoCompleteHours} hours.`,
    },
  });
  await notify(order.buyerId, {
    title: `Delivered: ${order.number}`,
    body: "Check your order and confirm it to release payment. Something wrong? Open a dispute from the order page.",
    href: `/orders/${order.number}`,
    email: true,
  });
}

/** Completes an order and releases escrow to the earner. */
export async function completeOrder(orderId: string, by: { kind: "buyer" | "auto" | "staff"; actorId?: string }) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { seller: { select: { userId: true } }, booster: { select: { userId: true } } },
  });
  if (!order) throw new OrderError("Order not found.");
  if (by.kind === "buyer" && order.buyerId !== by.actorId) throw new OrderError("Order not found.");
  const allowed = by.kind === "staff" ? ["PAID", "IN_PROGRESS", "DELIVERED", "DISPUTED"] : ["DELIVERED"];
  const earnerId = order.type === "MARKET" ? order.sellerId : order.boosterId;
  if (!earnerId) throw new OrderError("There's no seller or booster to pay on this order yet.");

  const done = await db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, status: { in: allowed as never } },
      data: { status: "COMPLETED", completedAt: new Date(), autoCompleteAt: null },
    });
    if (res.count !== 1) return false;
    await tx.sellerProfile.update({
      where: { id: earnerId },
      data: {
        pendingBalance: { decrement: order.payoutAmount },
        balance: { increment: order.payoutAmount },
        totalEarned: { increment: order.payoutAmount },
        completedOrders: { increment: 1 },
      },
    });
    await tx.walletTransaction.create({
      data: { sellerId: earnerId, type: "ESCROW_RELEASE", amount: order.payoutAmount, orderId, note: `Released ${order.number}` },
    });
    await tx.orderMessage.create({
      data: {
        orderId,
        kind: "SYSTEM",
        body:
          by.kind === "buyer"
            ? "The buyer confirmed the order. Payment released."
            : by.kind === "auto"
              ? "Order completed automatically after the protection window. Payment released."
              : "Staff completed this order. Payment released.",
      },
    });
    return true;
  });
  if (!done) throw new OrderError("This order can't be completed now.");

  const earnerUser = order.type === "MARKET" ? order.seller?.userId : order.booster?.userId;
  if (earnerUser) {
    await notify(earnerUser, {
      title: `Payment released for ${order.number}`,
      body: "The order is complete and your earnings are available to withdraw.",
      href: "/seller/wallet",
    });
  }
  if (by.kind !== "buyer") {
    await notify(order.buyerId, { title: `Order completed: ${order.number}`, body: "Leave a review to help other players.", href: `/orders/${order.number}` });
  }
  if (by.kind === "staff") await audit(by.actorId ?? null, "order.complete", "Order", orderId);
}

export async function cancelUnpaidOrder(orderId: string, buyerId: string) {
  const res = await db.order.updateMany({
    where: { id: orderId, buyerId, status: "PENDING_PAYMENT" },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  if (res.count !== 1) throw new OrderError("Only unpaid orders can be cancelled.");
}

/** Runs from the cron endpoint: completes delivered orders past their protection window. */
export async function autoCompleteDueOrders(limit = 100) {
  const due = await db.order.findMany({
    where: { status: "DELIVERED", autoCompleteAt: { lte: new Date() } },
    select: { id: true },
    take: limit,
  });
  let completed = 0;
  for (const o of due) {
    try {
      await completeOrder(o.id, { kind: "auto" });
      completed++;
    } catch (err) {
      console.error("[auto-complete]", o.id, err);
    }
  }
  // Expire unpaid orders after 24 hours so they don't clutter dashboards.
  const expired = await db.order.updateMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lte: new Date(Date.now() - 24 * 3600_000) } },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  return { completed, expired: expired.count };
}

// ───────────────────────── refunds & disputes ─────────────────────────

/**
 * Marks an order refunded and unwinds escrow. Call AFTER the provider refund
 * succeeded (see payments.refundPayment), or for manual refunds.
 */
export async function markOrderRefunded(orderId: string, actorId: string | null, reason: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderError("Order not found.");
  if (!["PAID", "IN_PROGRESS", "DELIVERED", "DISPUTED", "COMPLETED"].includes(order.status)) throw new OrderError("This order can't be refunded.");
  const earnerId = order.type === "MARKET" ? order.sellerId : order.boosterId;

  await db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: "REFUNDED", refundedAt: new Date(), autoCompleteAt: null },
    });
    if (res.count !== 1) throw new OrderError("The order changed while refunding. Reload and try again.");
    if (earnerId && order.payoutAmount > 0) {
      if (order.status === "COMPLETED") {
        await tx.sellerProfile.update({
          where: { id: earnerId },
          data: { balance: { decrement: order.payoutAmount }, totalEarned: { decrement: order.payoutAmount } },
        });
        await tx.walletTransaction.create({
          data: { sellerId: earnerId, type: "ADJUSTMENT", amount: -order.payoutAmount, orderId, note: `Refund after completion: ${order.number}` },
        });
      } else {
        await reverseHold(tx, earnerId, order.payoutAmount, orderId, `Refunded ${order.number}`);
      }
    }
    await tx.orderMessage.create({ data: { orderId, kind: "SYSTEM", body: `Order refunded. ${reason}`.trim() } });
  });

  await notify(order.buyerId, {
    title: `Refund issued for ${order.number}`,
    body: "Your refund is on its way. Card and PayPal refunds usually arrive within 5–10 business days.",
    href: `/orders/${order.number}`,
    email: true,
  });
  await audit(actorId, "order.refund", "Order", orderId, { reason });
}

export async function openDispute(orderId: string, buyerId: string, reason: string, details: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { seller: { select: { userId: true } }, booster: { select: { userId: true } }, dispute: true },
  });
  if (!order || order.buyerId !== buyerId) throw new OrderError("Order not found.");
  if (order.dispute && order.dispute.status === "OPEN") throw new OrderError("A dispute is already open.");
  if (!ACTIVE_STATUSES.includes(order.status as (typeof ACTIVE_STATUSES)[number])) throw new OrderError("You can only dispute active orders.");

  await db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: "DISPUTED", autoCompleteAt: null },
    });
    if (res.count !== 1) throw new OrderError("The order changed. Reload and try again.");
    if (order.dispute) {
      await tx.dispute.update({
        where: { id: order.dispute.id },
        data: { reason, details, status: "OPEN", previousStatus: order.status, resolution: null, resolvedAt: null, resolvedById: null },
      });
    } else {
      await tx.dispute.create({ data: { orderId, openedById: buyerId, reason, details, previousStatus: order.status } });
    }
    await tx.orderMessage.create({
      data: { orderId, kind: "SYSTEM", body: `The buyer opened a dispute: ${reason}. Funds are frozen until staff review it.` },
    });
  });
  const other = order.type === "MARKET" ? order.seller?.userId : order.booster?.userId;
  if (other) {
    await notify(other, { title: `Dispute opened on ${order.number}`, body: "Reply in the order chat with any evidence. Staff will review.", href: `/orders/${order.number}`, email: true });
  }
}

/** Staff resolution. "refund" requires the provider refund to be done by the caller first. */
export async function resolveDispute(disputeId: string, staffId: string, outcome: "refund" | "release" | "reopen", note: string) {
  const dispute = await db.dispute.findUnique({ where: { id: disputeId }, include: { order: true } });
  if (!dispute || dispute.status !== "OPEN") throw new OrderError("This dispute isn't open.");
  const { order } = dispute;

  if (outcome === "refund") {
    await markOrderRefunded(order.id, staffId, note ? `Dispute resolved: ${note}` : "Dispute resolved in the buyer's favour.");
  } else if (outcome === "release") {
    await completeOrder(order.id, { kind: "staff", actorId: staffId });
  } else {
    const settings = await getSettings();
    await db.order.update({
      where: { id: order.id },
      data: {
        status: dispute.previousStatus,
        autoCompleteAt: dispute.previousStatus === "DELIVERED" ? new Date(Date.now() + settings.autoCompleteHours * 3600_000) : null,
        messages: { create: { kind: "SYSTEM", body: `Staff closed the dispute and resumed the order.${note ? ` ${note}` : ""}` } },
      },
    });
  }
  await db.dispute.update({
    where: { id: disputeId },
    data: {
      status: outcome === "refund" ? "RESOLVED_REFUND" : outcome === "release" ? "RESOLVED_RELEASE" : "CLOSED",
      resolution: note || null,
      resolvedById: staffId,
      resolvedAt: new Date(),
    },
  });
  await notify(order.buyerId, { title: `Dispute update for ${order.number}`, body: note || "Staff reviewed your dispute.", href: `/orders/${order.number}`, email: true });
  await audit(staffId, `dispute.${outcome}`, "Dispute", disputeId, { orderId: order.id, note });
}

// ───────────────────────── messages & reviews ─────────────────────────

export async function postOrderMessage(orderId: string, user: { id: string; role: string; sellerProfile: { id: string } | null }, body: string) {
  const text = body.trim().slice(0, 2000);
  if (!text) throw new OrderError("Write a message first.");
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { seller: { select: { userId: true } }, booster: { select: { userId: true } } },
  });
  if (!order) throw new OrderError("Order not found.");
  const staff = user.role === "ADMIN" || user.role === "SUPPORT";
  const isBuyer = order.buyerId === user.id;
  const isEarner = !!user.sellerProfile && (order.sellerId === user.sellerProfile.id || order.boosterId === user.sellerProfile.id);
  if (!isBuyer && !isEarner && !staff) throw new OrderError("Order not found.");
  if (order.status === "PENDING_PAYMENT" && !staff) throw new OrderError("Chat opens once the order is paid.");
  const recent = await db.orderMessage.count({ where: { senderId: user.id, createdAt: { gte: new Date(Date.now() - 60_000) } } });
  if (recent >= 15) throw new OrderError("You're sending messages too fast. Wait a moment.");

  await db.orderMessage.create({
    data: { orderId, senderId: user.id, body: text, kind: staff && !isBuyer && !isEarner ? "STAFF" : "USER" },
  });

  const recipients = new Set<string>();
  if (!isBuyer) recipients.add(order.buyerId);
  const earnerUser = order.type === "MARKET" ? order.seller?.userId : order.booster?.userId;
  if (earnerUser && !isEarner) recipients.add(earnerUser);
  recipients.delete(user.id);
  for (const r of recipients) {
    await notify(r, { title: `New message on ${order.number}`, body: text.slice(0, 140), href: `/orders/${order.number}` });
  }
}

export async function leaveReview(orderId: string, buyerId: string, rating: number, comment: string | null) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { review: true } });
  if (!order || order.buyerId !== buyerId) throw new OrderError("Order not found.");
  if (order.status !== "COMPLETED") throw new OrderError("You can review once the order is completed.");
  if (order.review) throw new OrderError("You already reviewed this order.");
  const sellerId = order.type === "MARKET" ? order.sellerId : order.boosterId;
  if (!sellerId) throw new OrderError("Nobody to review on this order.");
  const r = Math.min(5, Math.max(1, Math.round(rating)));
  await db.$transaction([
    db.review.create({ data: { orderId, authorId: buyerId, sellerId, rating: r, comment: comment?.trim().slice(0, 1000) || null } }),
    db.sellerProfile.update({ where: { id: sellerId }, data: { ratingSum: { increment: r }, ratingCount: { increment: 1 } } }),
  ]);
}

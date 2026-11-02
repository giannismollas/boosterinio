/*
  Local end-to-end check of the order + escrow engine against the dev database.
  Requires the demo seed (SEED_DEMO=true npm run db:seed). Never run on production.
    npx tsx scripts/flow-check.ts
*/
import "dotenv/config";
import assert from "node:assert/strict";
import { defaultSelection } from "../src/lib/boosting/engine";
import { db } from "../src/server/db";
import {
  claimBoostOrder,
  completeOrder,
  createBoostOrder,
  createMarketOrder,
  deliverOrder,
  markOrderPaid,
  markOrderRefunded,
  openDispute,
  resolveDispute,
  updateBoostProgress,
} from "../src/server/orders";
import { rejectPayout, requestPayout } from "../src/server/wallet";

async function profile(email: string) {
  const u = await db.user.findUniqueOrThrow({ where: { email }, include: { sellerProfile: true } });
  return u;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to run in production");
  const buyer = await profile("buyer@boosterinio.local");
  const booster = await profile("booster@boosterinio.local");
  const seller = await profile("seller@boosterinio.local");
  assert(booster.sellerProfile && seller.sellerProfile, "demo profiles missing");

  // ── Boost: create → pay → claim → progress → deliver → confirm ──
  const service = await db.boostService.findFirstOrThrow({ where: { slug: "rank-boost" } });
  const sel = defaultSelection("RANK", service.config);
  const order = await createBoostOrder({ buyerId: buyer.id, serviceId: service.id, selection: sel });
  assert.equal(order.status, "PENDING_PAYMENT");
  console.log(`boost order ${order.number} total ${order.total}`);

  const tampered = await markOrderPaid(order.id, { provider: "TEST", amount: order.total - 100 });
  assert.equal(tampered.ok, false, "underpayment must be rejected");

  await markOrderPaid(order.id, { provider: "TEST", amount: order.total, currency: "EUR" });
  const again = await markOrderPaid(order.id, { provider: "TEST", amount: order.total });
  assert.equal(again.ok && "already" in again && again.already, true, "second webhook is a no-op");
  const paid = await db.order.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(paid.status, "PAID");
  assert.equal(paid.payoutAmount, Math.round(paid.subtotal * 0.7));

  const before = await db.sellerProfile.findUniqueOrThrow({ where: { id: booster.sellerProfile.id } });
  await claimBoostOrder(order.id, booster.sellerProfile);
  await assert.rejects(() => claimBoostOrder(order.id, booster.sellerProfile!), /already claimed/);
  const afterClaim = await db.sellerProfile.findUniqueOrThrow({ where: { id: booster.sellerProfile.id } });
  assert.equal(afterClaim.pendingBalance, before.pendingBalance + paid.payoutAmount, "escrow hold on claim");

  await updateBoostProgress(order.id, booster.sellerProfile.id, { currentRank: "Gold IV", wins: 4, losses: 1 });
  await deliverOrder(order.id, booster.sellerProfile.id);
  await assert.rejects(() => completeOrder(order.id, { kind: "buyer", actorId: seller.id }), /not found/i);
  await completeOrder(order.id, { kind: "buyer", actorId: buyer.id });
  const afterDone = await db.sellerProfile.findUniqueOrThrow({ where: { id: booster.sellerProfile.id } });
  assert.equal(afterDone.pendingBalance, before.pendingBalance, "escrow released");
  assert.equal(afterDone.balance, before.balance + paid.payoutAmount, "balance credited");
  console.log("boost flow ok");

  // ── Market instant: pay → auto-deliver → dispute → refund ──
  const instant = await db.listing.findFirstOrThrow({ where: { sellerId: seller.sellerProfile.id, deliveryMethod: "INSTANT", status: "ACTIVE" } });
  await db.stockItem.create({ data: { listingId: instant.id, payload: "v1.test.test.test" } });
  const sBefore = await db.sellerProfile.findUniqueOrThrow({ where: { id: seller.sellerProfile.id } });
  const m = await createMarketOrder({ buyerId: buyer.id, listingId: instant.id, quantity: 1 });
  await markOrderPaid(m.id, { provider: "TEST", amount: m.total, currency: "EUR" });
  const mPaid = await db.order.findUniqueOrThrow({ where: { id: m.id }, include: { stockItems: true } });
  assert.equal(mPaid.status, "DELIVERED", "instant listings deliver on payment");
  assert.equal(mPaid.stockItems.length, 1);
  assert.equal(mPaid.payoutAmount, m.subtotal - Math.round(m.subtotal * 0.1));
  await openDispute(m.id, buyer.id, "Not as described", "The account details did not work at all when I tried them.");
  const dispute = await db.dispute.findUniqueOrThrow({ where: { orderId: m.id } });
  await resolveDispute(dispute.id, seller.id, "refund", "Refunded in test");
  const sAfter = await db.sellerProfile.findUniqueOrThrow({ where: { id: seller.sellerProfile.id } });
  assert.equal(sAfter.pendingBalance, sBefore.pendingBalance, "escrow reversed on refund");
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: m.id } })).status, "REFUNDED");
  console.log("market + dispute + refund flow ok");

  // ── Refund after completion claws back the balance ──
  await markOrderRefunded(order.id, null, "test refund after completion");
  const clawed = await db.sellerProfile.findUniqueOrThrow({ where: { id: booster.sellerProfile.id } });
  assert.equal(clawed.balance, before.balance, "completed refund reverses earnings");
  console.log("post-completion refund ok");

  // ── Payout request / reject ──
  await db.sellerProfile.update({ where: { id: seller.sellerProfile.id }, data: { balance: { increment: 5000 } } });
  const pBefore = await db.sellerProfile.findUniqueOrThrow({ where: { id: seller.sellerProfile.id } });
  await requestPayout(seller.sellerProfile.id, 2500, "PAYPAL", "seller@example.com");
  const payout = await db.payout.findFirstOrThrow({ where: { sellerId: seller.sellerProfile.id, status: "REQUESTED" } });
  await rejectPayout(payout.id, seller.id, "test");
  const pAfter = await db.sellerProfile.findUniqueOrThrow({ where: { id: seller.sellerProfile.id } });
  assert.equal(pAfter.balance, pBefore.balance, "rejected payout returns funds");
  await db.sellerProfile.update({ where: { id: seller.sellerProfile.id }, data: { balance: { decrement: 5000 } } });
  console.log("payout flow ok");

  console.log("\nALL FLOW CHECKS PASSED");
}

main()
  .catch((e) => {
    console.error("FLOW CHECK FAILED:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

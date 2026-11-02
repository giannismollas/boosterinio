import { formatMoney } from "@/lib/utils";
import { db } from "./db";
import { audit, notify } from "./notify";
import { getSettings } from "./settings";

export class WalletError extends Error {}

/** Moves money from available balance into a payout request. */
export async function requestPayout(sellerId: string, amount: number, method: string, details: string) {
  const settings = await getSettings();
  if (!Number.isInteger(amount) || amount < settings.minPayoutCents) {
    throw new WalletError(`The minimum payout is ${formatMoney(settings.minPayoutCents)}.`);
  }
  if (!details.trim()) throw new WalletError("Add your payout details.");
  const open = await db.payout.count({ where: { sellerId, status: "REQUESTED" } });
  if (open > 0) throw new WalletError("You already have a payout waiting. Wait until it's processed.");

  await db.$transaction(async (tx) => {
    const res = await tx.sellerProfile.updateMany({
      where: { id: sellerId, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    if (res.count !== 1) throw new WalletError("You don't have enough available balance.");
    const payout = await tx.payout.create({ data: { sellerId, amount, method, details: details.trim().slice(0, 500) } });
    await tx.walletTransaction.create({
      data: { sellerId, type: "PAYOUT", amount: -amount, payoutId: payout.id, note: `Payout request (${method})` },
    });
  });
}

export async function markPayoutPaid(payoutId: string, staffId: string, reference: string | null, note: string | null) {
  const payout = await db.payout.findUnique({ where: { id: payoutId }, include: { seller: { select: { userId: true } } } });
  if (!payout || payout.status !== "REQUESTED") throw new WalletError("This payout isn't waiting.");
  await db.payout.update({
    where: { id: payoutId },
    data: { status: "PAID", reference: reference || null, staffNote: note || null, processedAt: new Date() },
  });
  await notify(payout.seller.userId, {
    title: `Payout sent: ${formatMoney(payout.amount)}`,
    body: reference ? `Reference: ${reference}` : "Your payout has been sent.",
    href: "/seller/wallet",
    email: true,
  });
  await audit(staffId, "payout.paid", "Payout", payoutId, { amount: payout.amount, reference });
}

export async function rejectPayout(payoutId: string, staffId: string, note: string) {
  const payout = await db.payout.findUnique({ where: { id: payoutId }, include: { seller: { select: { userId: true } } } });
  if (!payout || payout.status !== "REQUESTED") throw new WalletError("This payout isn't waiting.");
  await db.$transaction([
    db.payout.update({ where: { id: payoutId }, data: { status: "REJECTED", staffNote: note || null, processedAt: new Date() } }),
    db.sellerProfile.update({ where: { id: payout.sellerId }, data: { balance: { increment: payout.amount } } }),
    db.walletTransaction.create({
      data: { sellerId: payout.sellerId, type: "PAYOUT_REVERSAL", amount: payout.amount, payoutId, note: "Payout rejected, returned to balance" },
    }),
  ]);
  await notify(payout.seller.userId, {
    title: "Payout request declined",
    body: note || "Your payout was declined and the amount returned to your balance.",
    href: "/seller/wallet",
    email: true,
  });
  await audit(staffId, "payout.rejected", "Payout", payoutId, { note });
}

/** Manual correction by an admin (positive or negative cents). */
export async function adjustBalance(sellerId: string, amount: number, staffId: string, note: string) {
  if (!Number.isInteger(amount) || amount === 0) throw new WalletError("Enter a non-zero amount.");
  await db.$transaction([
    db.sellerProfile.update({ where: { id: sellerId }, data: { balance: { increment: amount } } }),
    db.walletTransaction.create({ data: { sellerId, type: "ADJUSTMENT", amount, note: note || "Manual adjustment" } }),
  ]);
  await audit(staffId, "wallet.adjust", "SellerProfile", sellerId, { amount, note });
}

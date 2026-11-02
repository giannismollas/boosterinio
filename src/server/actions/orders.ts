"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DISPUTE_REASONS } from "@/lib/catalog";
import { fail, guard, ok, type ActionState } from "@/lib/action";
import { db } from "@/server/db";
import {
  completeOrder,
  deliverOrder,
  leaveReview,
  openDispute,
  OrderError,
  postOrderMessage,
  setBoostLogin,
  setBoostPaused,
  updateBoostProgress,
} from "@/server/orders";
import { requireUser } from "@/server/session";

async function orderByNumber(fd: FormData) {
  const number = String(fd.get("number") ?? "");
  const order = await db.order.findUnique({ where: { number } });
  if (!order) throw new OrderError("Order not found.");
  return order;
}

const refresh = (number: string) => revalidatePath(`/orders/${number}`);

export async function sendMessageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  return guard(async () => {
    const order = await orderByNumber(fd);
    await postOrderMessage(order.id, user, String(fd.get("body") ?? ""));
    refresh(order.number);
    return ok();
  }, [OrderError]);
}

const loginSchema = z.object({
  login: z.string().trim().min(1, "Enter your login name.").max(120),
  password: z.string().min(1, "Enter your password.").max(200),
  summonerName: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function setBoostLoginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  return guard(async () => {
    const order = await orderByNumber(fd);
    const data = loginSchema.parse({
      login: fd.get("login"),
      password: fd.get("password"),
      summonerName: fd.get("summonerName") || undefined,
      notes: fd.get("notes") || undefined,
    });
    await setBoostLogin(order.id, user.id, data);
    refresh(order.number);
    return ok("Account details saved and encrypted.");
  }, [OrderError]);
}

/** Duo boosts only need the buyer's in-game name, never a password. */
export async function setDuoInfoAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  return guard(async () => {
    const order = await orderByNumber(fd);
    const summonerName = z.string().trim().min(2, "Enter your Riot ID.").max(60).parse(fd.get("summonerName"));
    const notes = z.string().trim().max(500).optional().parse(fd.get("notes") || undefined);
    await setBoostLogin(order.id, user.id, { login: "", password: "", summonerName, notes });
    refresh(order.number);
    return ok("Saved. Your booster will add you in game.");
  }, [OrderError]);
}

export async function pauseBoostAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  return guard(async () => {
    const order = await orderByNumber(fd);
    const paused = fd.get("paused") === "1";
    await setBoostPaused(order.id, user.id, paused);
    refresh(order.number);
    return ok(paused ? "Boost paused. Your booster has been told to stop." : "Boost resumed.");
  }, [OrderError]);
}

export async function confirmOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  return guard(async () => {
    const order = await orderByNumber(fd);
    await completeOrder(order.id, { kind: "buyer", actorId: user.id });
    refresh(order.number);
    return ok("Order confirmed. Thanks for playing!");
  }, [OrderError]);
}

export async function openDisputeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  return guard(async () => {
    const order = await orderByNumber(fd);
    const reason = z.enum(DISPUTE_REASONS as [string, ...string[]], { message: "Choose a reason." }).parse(fd.get("reason"));
    const details = z.string().trim().min(20, "Describe the problem in at least 20 characters.").max(2000).parse(fd.get("details"));
    await openDispute(order.id, user.id, reason, details);
    refresh(order.number);
    return ok("Dispute opened. Staff will review it and reply in the order chat.");
  }, [OrderError]);
}

export async function leaveReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  return guard(async () => {
    const order = await orderByNumber(fd);
    const rating = z.coerce.number().int().min(1, "Pick a rating.").max(5).parse(fd.get("rating"));
    const comment = z.string().trim().max(1000).optional().parse(fd.get("comment") || undefined);
    await leaveReview(order.id, user.id, rating, comment ?? null);
    refresh(order.number);
    return ok("Review posted. Thank you!");
  }, [OrderError]);
}

export async function deliverOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  return guard(async () => {
    if (!user.sellerProfile) throw new OrderError("You can't deliver this order.");
    const order = await orderByNumber(fd);
    const note = z.string().trim().max(4000).optional().parse(fd.get("note") || undefined);
    if (order.type === "MARKET" && !note) return fail("Add the delivery details (login, code or trade info) for the buyer.");
    await deliverOrder(order.id, user.sellerProfile.id, note);
    refresh(order.number);
    return ok("Marked as delivered. The buyer has been notified.");
  }, [OrderError]);
}

export async function boostProgressAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  return guard(async () => {
    if (!user.sellerProfile) throw new OrderError("You can't update this order.");
    const order = await orderByNumber(fd);
    const data = z
      .object({
        currentRank: z.string().trim().max(60).optional(),
        wins: z.coerce.number().int().min(0).max(999).optional(),
        losses: z.coerce.number().int().min(0).max(999).optional(),
        note: z.string().trim().max(500).optional(),
      })
      .parse({
        currentRank: fd.get("currentRank") || undefined,
        wins: fd.get("wins") || undefined,
        losses: fd.get("losses") || undefined,
        note: fd.get("note") || undefined,
      });
    await updateBoostProgress(order.id, user.sellerProfile.id, data);
    refresh(order.number);
    return ok("Progress updated.");
  }, [OrderError]);
}

export async function markNotificationsReadAction(): Promise<ActionState> {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/dashboard/notifications");
  return ok("All caught up.");
}

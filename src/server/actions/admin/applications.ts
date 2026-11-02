"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, guard, ok, type ActionState } from "@/lib/action";
import { db } from "@/server/db";
import { invalidate } from "@/server/memo";
import { audit, notify } from "@/server/notify";
import { requireStaff } from "@/server/session";

function refresh(id: string, slug?: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/admin/applications/${id}`);
  if (slug) revalidatePath(`/sellers/${slug}`);
  revalidatePath("/seller", "layout");
  invalidate("listings");
}

async function load(id: string) {
  return db.sellerProfile.findUnique({ where: { id }, select: { id: true, userId: true, slug: true, status: true, applicationType: true, canSell: true, canBoost: true } });
}

/** Approves an application, or updates permissions of an approved seller. */
export async function approveApplicationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const id = z.string().min(1).parse(fd.get("id"));
    const canSell = fd.get("canSell") === "on";
    const canBoost = fd.get("canBoost") === "on";
    const reviewNote = z.string().trim().max(1000).parse(fd.get("reviewNote") ?? "");
    if (!canSell && !canBoost) return fail("Allow selling, boosting, or both.");
    const profile = await load(id);
    if (!profile) return fail("Application not found.");
    const wasApproved = profile.status === "APPROVED";

    await db.sellerProfile.update({
      where: { id },
      data: { status: "APPROVED", canSell, canBoost, reviewNote: reviewNote || null, reviewedAt: new Date() },
    });
    if (!canSell) {
      await db.listing.updateMany({ where: { sellerId: id, status: "ACTIVE" }, data: { status: "PAUSED" } });
    }
    const what = [canSell ? "sell" : null, canBoost ? "take boosting orders" : null].filter(Boolean).join(" and ");
    await notify(profile.userId, {
      title: wasApproved ? "Your seller permissions were updated" : "You're approved on Boosterinio",
      body: `You can now ${what}.${reviewNote ? `\n\nNote from our team: ${reviewNote}` : ""}`,
      href: "/seller",
      email: true,
    });
    await audit(staff.id, wasApproved ? "seller.permissions" : "seller.approve", "SellerProfile", id, { canSell, canBoost });
    refresh(id, profile.slug);
    return ok(wasApproved ? "Permissions updated." : "Application approved.");
  });
}

export async function rejectApplicationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const id = z.string().min(1).parse(fd.get("id"));
    const reviewNote = z.string().trim().min(5, "Tell the applicant why (at least a few words).").max(1000).parse(fd.get("reviewNote") ?? "");
    const profile = await load(id);
    if (!profile) return fail("Application not found.");
    await db.sellerProfile.update({
      where: { id },
      data: { status: "REJECTED", canSell: false, canBoost: false, reviewNote, reviewedAt: new Date() },
    });
    await db.listing.updateMany({ where: { sellerId: id, status: { in: ["ACTIVE", "PENDING"] } }, data: { status: "PAUSED" } });
    await notify(profile.userId, {
      title: "Your seller application wasn't approved",
      body: `${reviewNote}\n\nYou can update your details and apply again from the Sell page.`,
      href: "/sell",
      email: true,
    });
    await audit(staff.id, "seller.reject", "SellerProfile", id, { reviewNote });
    refresh(id, profile.slug);
    return ok("Application rejected.");
  });
}

export async function suspendSellerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const id = z.string().min(1).parse(fd.get("id"));
    const reviewNote = z.string().trim().min(5, "Add the reason for the suspension.").max(1000).parse(fd.get("reviewNote") ?? "");
    const profile = await load(id);
    if (!profile) return fail("Seller not found.");
    if (profile.status !== "APPROVED") return fail("Only approved sellers can be suspended.");
    const paused = await db.$transaction(async (tx) => {
      await tx.sellerProfile.update({ where: { id }, data: { status: "SUSPENDED", reviewNote, reviewedAt: new Date() } });
      const res = await tx.listing.updateMany({ where: { sellerId: id, status: "ACTIVE" }, data: { status: "PAUSED" } });
      return res.count;
    });
    await notify(profile.userId, {
      title: "Your seller account is suspended",
      body: `${reviewNote}\n\nYour listings are paused. Open a support ticket if you think this is a mistake.`,
      href: "/support",
      email: true,
    });
    await audit(staff.id, "seller.suspend", "SellerProfile", id, { reviewNote, pausedListings: paused });
    refresh(id, profile.slug);
    return ok(`Seller suspended. ${paused} listing${paused === 1 ? "" : "s"} paused.`);
  });
}

export async function reinstateSellerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const id = z.string().min(1).parse(fd.get("id"));
    const profile = await load(id);
    if (!profile) return fail("Seller not found.");
    if (profile.status === "APPROVED") return fail("This seller is already approved.");
    const fromType = {
      canSell: profile.applicationType !== "BOOSTER",
      canBoost: profile.applicationType !== "SELLER",
    };
    const keep = profile.canSell || profile.canBoost;
    await db.sellerProfile.update({
      where: { id },
      data: { status: "APPROVED", reviewedAt: new Date(), ...(keep ? {} : fromType) },
    });
    await notify(profile.userId, {
      title: "Your seller account is active again",
      body: "You can sell and boost again. Paused listings stay paused until you resume them.",
      href: "/seller",
      email: true,
    });
    await audit(staff.id, "seller.reinstate", "SellerProfile", id);
    refresh(id, profile.slug);
    return ok("Seller reinstated.");
  });
}

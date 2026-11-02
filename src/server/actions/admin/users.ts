"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, guard, ok, type ActionState } from "@/lib/action";
import { sellerUrl } from "@/lib/urls";
import { formatMoney, parseMoney } from "@/lib/utils";
import { db } from "@/server/db";
import { invalidate } from "@/server/memo";
import { audit, notify } from "@/server/notify";
import { requireAdmin } from "@/server/session";
import { adjustBalance, WalletError } from "@/server/wallet";

function refresh(userId: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/admin/users/${userId}`);
}

export async function setRoleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const { id, role } = z
      .object({ id: z.string().min(1), role: z.enum(["USER", "SUPPORT", "ADMIN"], { message: "Pick a role." }) })
      .parse({ id: fd.get("id"), role: fd.get("role") });
    if (id === admin.id) return fail("You can't change your own role.");
    const user = await db.user.findUnique({ where: { id }, select: { role: true } });
    if (!user) return fail("User not found.");
    if (user.role === role) return fail("The user already has this role.");
    await db.user.update({ where: { id }, data: { role } });
    await audit(admin.id, "user.role", "User", id, { from: user.role, to: role });
    refresh(id);
    return ok(`Role changed to ${role.toLowerCase()}.`);
  });
}

export async function banUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const { id, op, reason } = z
      .object({ id: z.string().min(1), op: z.enum(["ban", "unban"]), reason: z.string().trim().max(500).default("") })
      .parse({ id: fd.get("id"), op: fd.get("op"), reason: fd.get("reason") ?? "" });
    if (id === admin.id) return fail("You can't ban yourself.");
    const user = await db.user.findUnique({ where: { id }, select: { role: true, sellerProfile: { select: { id: true } } } });
    if (!user) return fail("User not found.");

    if (op === "ban") {
      if (user.role === "ADMIN") return fail("Remove the admin role before banning this account.");
      if (reason.length < 3) return fail("Add a reason for the ban.");
      const paused = await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id }, data: { banned: true, banReason: reason } });
        await tx.session.deleteMany({ where: { userId: id } });
        if (!user.sellerProfile) return 0;
        const res = await tx.listing.updateMany({ where: { sellerId: user.sellerProfile.id, status: "ACTIVE" }, data: { status: "PAUSED" } });
        return res.count;
      });
      invalidate("listings");
      await audit(admin.id, "user.ban", "User", id, { reason, pausedListings: paused });
      refresh(id);
      return ok(paused ? `User banned and signed out. ${paused} listing(s) paused.` : "User banned and signed out.");
    }

    await db.user.update({ where: { id }, data: { banned: false, banReason: null } });
    await audit(admin.id, "user.unban", "User", id);
    refresh(id);
    return ok("Ban lifted.");
  });
}

/** The verified badge: granted by staff after checking identity and track record, separate from approval. */
export async function setSellerVerifiedAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const { id, op } = z.object({ id: z.string().min(1), op: z.enum(["verify", "unverify"]) }).parse({ id: fd.get("id"), op: fd.get("op") });
    const user = await db.user.findUnique({ where: { id }, select: { sellerProfile: { select: { id: true, slug: true, status: true, verified: true } } } });
    const profile = user?.sellerProfile;
    if (!profile) return fail("This user has no store.");
    if (op === "verify") {
      if (profile.status !== "APPROVED") return fail("Approve the seller before verifying them.");
      if (profile.verified) return fail("This store is already verified.");
      await db.sellerProfile.update({ where: { id: profile.id }, data: { verified: true, verifiedAt: new Date() } });
      await notify(id, { title: "Your store is verified", body: "Buyers now see the verified badge next to your store name.", href: sellerUrl(profile.slug) });
    } else {
      if (!profile.verified) return fail("This store isn't verified.");
      await db.sellerProfile.update({ where: { id: profile.id }, data: { verified: false, verifiedAt: null } });
    }
    await audit(admin.id, op === "verify" ? "seller.verify" : "seller.unverify", "SellerProfile", profile.id);
    invalidate("listings");
    revalidatePath(sellerUrl(profile.slug), "layout");
    refresh(id);
    return ok(op === "verify" ? "Store verified. The badge shows on its storefront and listings." : "Verified badge removed.");
  });
}

export async function adjustWalletAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const sellerId = z.string().min(1).parse(fd.get("sellerId"));
    const userId = z.string().min(1).parse(fd.get("userId"));
    const raw = String(fd.get("amount") ?? "").trim();
    const note = z.string().trim().min(3, "Explain the adjustment; the seller sees it in their wallet.").max(300).parse(fd.get("note") ?? "");
    const negative = raw.startsWith("-");
    const cents = parseMoney(raw.replace(/^[-+]/, ""));
    if (!cents) return fail("Enter an amount, e.g. 12.50 or -5.");
    const amount = negative ? -cents : cents;
    await adjustBalance(sellerId, amount, admin.id, note);
    refresh(userId);
    revalidatePath(`/admin/applications/${sellerId}`);
    return ok(`Balance ${amount > 0 ? "credited" : "debited"} ${formatMoney(Math.abs(amount))}.`);
  }, [WalletError]);
}

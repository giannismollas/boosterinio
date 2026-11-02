"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, guard, ok, type ActionState } from "@/lib/action";
import { parseMoney } from "@/lib/utils";
import { db } from "@/server/db";
import { audit } from "@/server/notify";
import { requireAdmin } from "@/server/session";

export async function createCouponAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const base = z
      .object({
        code: z
          .string()
          .trim()
          .transform((s) => s.toUpperCase())
          .pipe(z.string().regex(/^[A-Z0-9_-]{3,24}$/, "Use 3–24 letters, numbers, dashes or underscores.")),
        type: z.enum(["PERCENT", "FIXED"]),
        scope: z.enum(["ALL", "BOOST", "MARKET"]),
      })
      .safeParse({ code: fd.get("code"), type: fd.get("type"), scope: fd.get("scope") });
    if (!base.success) {
      const fieldErrors: Record<string, string> = {};
      for (const i of base.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
      return fail(base.error.issues[0].message, fieldErrors);
    }
    const { code, type, scope } = base.data;

    const rawValue = String(fd.get("value") ?? "").trim();
    let value: number;
    if (type === "PERCENT") {
      value = Number(rawValue);
      if (!Number.isInteger(value) || value < 1 || value > 100) return fail("Percent discounts must be a whole number from 1 to 100.", { value: "1–100" });
    } else {
      const cents = parseMoney(rawValue);
      if (!cents) return fail("Enter the discount amount, e.g. 5.00.", { value: "Enter an amount." });
      value = cents;
    }
    const minOrder = parseMoney(String(fd.get("minOrder") ?? "")) ?? 0;
    const maxUsesRaw = String(fd.get("maxUses") ?? "").trim();
    const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null;
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) return fail("Max uses must be a whole number, or leave it empty for unlimited.");
    const expiresRaw = String(fd.get("expiresAt") ?? "").trim();
    const expiresAt = expiresRaw ? new Date(`${expiresRaw}T23:59:59Z`) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) return fail("Pick a valid expiry date.");

    const exists = await db.coupon.findUnique({ where: { code }, select: { id: true } });
    if (exists) return fail("A coupon with this code already exists.", { code: "Already exists." });

    const coupon = await db.coupon.create({
      data: { code, type, value, scope, minOrder, maxUses, expiresAt, isActive: fd.get("isActive") === "on" },
    });
    await audit(admin.id, "coupon.create", "Coupon", coupon.id, { code, type, value, scope });
    revalidatePath("/admin/coupons");
    return ok(`Coupon ${code} created.`);
  });
}

export async function toggleCouponAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const id = z.string().min(1).parse(fd.get("id"));
    const coupon = await db.coupon.findUnique({ where: { id }, select: { isActive: true, code: true } });
    if (!coupon) return fail("Coupon not found.");
    await db.coupon.update({ where: { id }, data: { isActive: !coupon.isActive } });
    await audit(admin.id, coupon.isActive ? "coupon.disable" : "coupon.enable", "Coupon", id, { code: coupon.code });
    revalidatePath("/admin/coupons");
    return ok(coupon.isActive ? `${coupon.code} disabled.` : `${coupon.code} enabled.`);
  });
}

export async function deleteCouponAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const id = z.string().min(1).parse(fd.get("id"));
    const coupon = await db.coupon.findUnique({ where: { id }, select: { code: true, usedCount: true, _count: { select: { orders: true } } } });
    if (!coupon) return fail("Coupon not found.");
    if (coupon.usedCount > 0 || coupon._count.orders > 0) return fail("This coupon has been used. Disable it instead so order history stays intact.");
    await db.coupon.delete({ where: { id } });
    await audit(admin.id, "coupon.delete", "Coupon", id, { code: coupon.code });
    revalidatePath("/admin/coupons");
    return ok(`${coupon.code} deleted.`);
  });
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, guard, ok, type ActionState } from "@/lib/action";
import { db } from "@/server/db";
import { audit } from "@/server/notify";
import { requireStaff } from "@/server/session";

/** Hides or restores a review and keeps the seller's rating totals in sync. */
export async function toggleReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const { id, hide } = z
      .object({ id: z.string().min(1), hide: z.enum(["true", "false"]).transform((v) => v === "true") })
      .parse({ id: fd.get("id"), hide: fd.get("hide") });
    const review = await db.review.findUnique({ where: { id }, select: { rating: true, sellerId: true, seller: { select: { slug: true } } } });
    if (!review) return fail("Review not found.");

    const changed = await db.$transaction(async (tx) => {
      const res = await tx.review.updateMany({ where: { id, isHidden: !hide }, data: { isHidden: hide } });
      if (res.count !== 1) return false;
      await tx.sellerProfile.update({
        where: { id: review.sellerId },
        data: hide
          ? { ratingSum: { decrement: review.rating }, ratingCount: { decrement: 1 } }
          : { ratingSum: { increment: review.rating }, ratingCount: { increment: 1 } },
      });
      return true;
    });
    if (!changed) return fail(hide ? "This review is already hidden." : "This review is already visible.");
    await audit(staff.id, hide ? "review.hide" : "review.unhide", "Review", id);
    revalidatePath("/admin/reviews");
    revalidatePath(`/sellers/${review.seller.slug}`);
    revalidatePath("/");
    return ok(hide ? "Review hidden. The seller's rating was recalculated." : "Review restored.");
  });
}

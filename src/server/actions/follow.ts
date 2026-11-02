"use server";

import { revalidatePath } from "next/cache";
import { fail, guard, ok, type ActionState } from "@/lib/action";
import { sellerUrl } from "@/lib/urls";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";

/** Follow or unfollow a store. Followers get a notification when it publishes a new listing. */
export async function toggleFollowAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const slug = String(fd.get("slug") ?? "");
  const user = await requireUser(sellerUrl(slug));
  return guard(async () => {
    const seller = await db.sellerProfile.findUnique({ where: { slug }, select: { id: true, userId: true, status: true, displayName: true } });
    if (!seller || seller.status !== "APPROVED") return fail("Store not found.");
    if (seller.userId === user.id) return fail("You can't follow your own store.");
    const key = { userId_sellerId: { userId: user.id, sellerId: seller.id } };
    const existing = await db.follow.findUnique({ where: key, select: { id: true } });
    if (existing) await db.follow.delete({ where: key });
    else await db.follow.create({ data: { userId: user.id, sellerId: seller.id } });
    revalidatePath(sellerUrl(slug), "layout");
    revalidatePath("/dashboard/following");
    return ok(existing ? `Unfollowed ${seller.displayName}.` : `Following ${seller.displayName}. New listings will show up in your notifications.`);
  });
}

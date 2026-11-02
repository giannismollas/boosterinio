"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, guard, ok, type ActionState } from "@/lib/action";
import { CATEGORIES, type ListingCategoryKey } from "@/lib/catalog";
import { listingUrl } from "@/lib/urls";
import { db } from "@/server/db";
import { invalidate } from "@/server/memo";
import { audit, notify } from "@/server/notify";
import { requireStaff } from "@/server/session";

const schema = z.object({
  id: z.string().min(1),
  op: z.enum(["approve", "reject", "remove", "feature", "unfeature"]),
  reason: z.string().trim().max(500).default(""),
});

export async function moderateListingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const { id, op, reason } = schema.parse({ id: fd.get("id"), op: fd.get("op"), reason: fd.get("reason") ?? "" });
    const listing = await db.listing.findUnique({
      where: { id },
      include: { seller: { select: { userId: true, status: true, canSell: true, slug: true } }, game: { select: { slug: true } } },
    });
    if (!listing) return fail("Listing not found.");

    let message = "";
    switch (op) {
      case "approve": {
        if (listing.seller.status !== "APPROVED" || !listing.seller.canSell) return fail("The seller isn't approved to sell. Approve the seller first.");
        await db.listing.update({ where: { id }, data: { status: "ACTIVE", rejectionReason: null } });
        await notify(listing.seller.userId, { title: "Your listing is live", body: listing.title, href: listingUrl(listing) });
        message = "Listing approved and live.";
        break;
      }
      case "reject": {
        if (reason.length < 5) return fail("Tell the seller what to fix (at least a few words).");
        await db.listing.update({ where: { id }, data: { status: "REJECTED", rejectionReason: reason } });
        await notify(listing.seller.userId, {
          title: "Your listing needs changes",
          body: `${listing.title}\n\n${reason}`,
          href: "/seller/listings",
          email: true,
        });
        message = "Listing rejected. The seller was told why.";
        break;
      }
      case "remove": {
        await db.listing.update({ where: { id }, data: { status: "REMOVED", featured: false, ...(reason ? { rejectionReason: reason } : {}) } });
        await notify(listing.seller.userId, {
          title: "A listing was removed by staff",
          body: `${listing.title}${reason ? `\n\n${reason}` : ""}`,
          href: "/seller/listings",
          email: true,
        });
        message = "Listing removed.";
        break;
      }
      case "feature":
      case "unfeature": {
        await db.listing.update({ where: { id }, data: { featured: op === "feature" } });
        message = op === "feature" ? "Listing featured on the storefront." : "Listing no longer featured.";
        break;
      }
    }
    await audit(staff.id, `listing.${op}`, "Listing", id, reason ? { reason } : undefined);

    invalidate("listings");
    revalidatePath("/admin", "layout");
    revalidatePath(`/admin/listings/${id}`);
    const cat = CATEGORIES[listing.category as ListingCategoryKey];
    revalidatePath(listingUrl(listing));
    revalidatePath(`/${listing.game.slug}/${cat.slug}`);
    revalidatePath(`/${cat.slug}`);
    revalidatePath(`/sellers/${listing.seller.slug}`);
    revalidatePath("/");
    return ok(message);
  });
}

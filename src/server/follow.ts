import { listingUrl } from "@/lib/urls";
import { db } from "./db";

/**
 * Marks a listing as published the first time it goes live and tells the store's
 * followers about it. Re-approvals after edits don't notify again. Never throws.
 */
export async function announceListing(listingId: string) {
  try {
    const first = await db.listing.updateMany({ where: { id: listingId, status: "ACTIVE", publishedAt: null }, data: { publishedAt: new Date() } });
    if (first.count === 0) return;
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: { slug: true, title: true, category: true, game: { select: { slug: true } }, seller: { select: { id: true, userId: true, displayName: true } } },
    });
    if (!listing) return;
    const followers = await db.follow.findMany({ where: { sellerId: listing.seller.id, userId: { not: listing.seller.userId } }, select: { userId: true } });
    if (!followers.length) return;
    await db.notification.createMany({
      data: followers.map((f) => ({ userId: f.userId, title: `New from ${listing.seller.displayName}`, body: listing.title, href: listingUrl(listing) })),
    });
  } catch (err) {
    console.error("[follow] announce failed", err);
  }
}

import { cache } from "react";
import type { ListingCategoryKey } from "@/lib/catalog";
import { db } from "@/server/db";

/** A public storefront: the approved seller, live listing counts per category and visible review count. */
export const getStore = cache(async (slug: string) => {
  const profile = await db.sellerProfile.findUnique({
    where: { slug },
    select: {
      id: true,
      userId: true,
      slug: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      bannerUrl: true,
      verified: true,
      status: true,
      canSell: true,
      canBoost: true,
      peakRank: true,
      ratingSum: true,
      ratingCount: true,
      completedOrders: true,
      createdAt: true,
      reviewedAt: true,
      user: { select: { lastSeenAt: true } },
      _count: { select: { followers: true } },
    },
  });
  if (!profile || profile.status !== "APPROVED") return null;
  const [groups, reviewCount] = await Promise.all([
    db.listing.groupBy({ by: ["category"], where: { sellerId: profile.id, status: "ACTIVE" }, _count: { _all: true } }),
    db.review.count({ where: { sellerId: profile.id, isHidden: false } }),
  ]);
  const counts: Partial<Record<ListingCategoryKey, number>> = {};
  for (const g of groups) counts[g.category] = g._count._all;
  return { ...profile, counts, reviewCount };
});

export type Store = NonNullable<Awaited<ReturnType<typeof getStore>>>;

/** Fields a review card needs. */
export const reviewSelect = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  author: { select: { name: true } },
  order: { select: { gameName: true, type: true, title: true } },
} as const;

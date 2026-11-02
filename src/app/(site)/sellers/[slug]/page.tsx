import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardRail } from "@/components/card-rail";
import { ListingCard, listingCardSelect } from "@/components/listing-card";
import { ReviewCard } from "@/components/store/review-card";
import { EmptyState } from "@/components/ui";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/catalog";
import { site } from "@/lib/site";
import { sellerUrl } from "@/lib/urls";
import { ratingPercent } from "@/lib/utils";
import { db } from "@/server/db";
import { getStore, reviewSelect } from "./store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) return { title: "Seller not found", robots: { index: false } };
  const pct = ratingPercent(store.ratingSum, store.ratingCount);
  const description =
    store.bio?.replace(/\s+/g, " ").slice(0, 155) ||
    `${store.displayName} on ${site.name}: ${store.canSell ? "game accounts, currency, items and top-ups" : "League of Legends boosting"}${
      pct ? `, ${pct}% rating from ${store.ratingCount} review${store.ratingCount === 1 ? "" : "s"}` : ""
    }. Escrow-protected orders.`;
  return {
    title: `${store.displayName} — Store`,
    description,
    alternates: { canonical: sellerUrl(store.slug) },
    openGraph: { title: `${store.displayName} — Store on ${site.name}`, description, url: sellerUrl(store.slug), ...(store.bannerUrl ? { images: [store.bannerUrl] } : {}) },
  };
}

/** Store tab: a row of cards per category the seller trades in, then the latest reviews. */
export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();
  const base = sellerUrl(store.slug);
  const cats = CATEGORY_ORDER.filter((c) => (store.counts[c] ?? 0) > 0);
  const [rows, reviews] = await Promise.all([
    Promise.all(
      cats.map((category) =>
        db.listing.findMany({
          where: { sellerId: store.id, status: "ACTIVE", category },
          orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
          take: 12,
          select: listingCardSelect,
        }),
      ),
    ),
    db.review.findMany({ where: { sellerId: store.id, isHidden: false }, orderBy: { createdAt: "desc" }, take: 4, select: reviewSelect }),
  ]);

  return (
    <div className="space-y-14">
      {cats.length ? (
        cats.map((c, i) => (
          <CardRail
            key={c}
            label={CATEGORIES[c].label}
            title={
              <h2 className="flex items-center gap-3">
                <span className="slash-label text-[1.375rem]">{CATEGORIES[c].label}</span>
                <span className="rounded-[7px] border border-cab-4 bg-cab-3 px-2 text-sm leading-6 text-ink-2 tnum">{store.counts[c]}</span>
              </h2>
            }
            action={
              <Link href={`${base}/${CATEGORIES[c].slug}`} className="mr-1 text-sm font-medium whitespace-nowrap text-phosphor hover:underline">
                Show all
              </Link>
            }
          >
            {rows[i].map((l) => (
              <ListingCard key={l.slug} listing={l} />
            ))}
          </CardRail>
        ))
      ) : (
        <EmptyState title="Nothing for sale right now">
          {store.canBoost && !store.canSell
            ? `${store.displayName} takes boosting orders. Order a boost and an approved booster like them claims it.`
            : "Check back later, or follow the store to hear about new listings."}
        </EmptyState>
      )}

      <section aria-labelledby="latest-reviews-h">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="latest-reviews-h" className="slash-label text-[1.375rem]">
            Latest reviews
          </h2>
          {store.reviewCount > reviews.length ? (
            <Link href={`${base}/reviews`} className="text-sm font-medium text-phosphor hover:underline">
              All {store.reviewCount} reviews
            </Link>
          ) : null}
        </div>
        {reviews.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </ul>
        ) : (
          <EmptyState title="No reviews yet">Buyers can review {store.displayName} after a completed order.</EmptyState>
        )}
      </section>
    </div>
  );
}

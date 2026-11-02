import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ListingCard, listingCardSelect } from "@/components/listing-card";
import { Avatar, EmptyState, Stars } from "@/components/ui";
import { site } from "@/lib/site";
import { formatDate, ratingOf, timeAgo } from "@/lib/utils";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

const getProfile = cache((slug: string) =>
  db.sellerProfile.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      status: true,
      canSell: true,
      canBoost: true,
      ratingSum: true,
      ratingCount: true,
      completedOrders: true,
      createdAt: true,
      reviewedAt: true,
    },
  }),
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile || profile.status !== "APPROVED") return { title: "Seller not found", robots: { index: false } };
  const rating = ratingOf(profile.ratingSum, profile.ratingCount);
  const description =
    profile.bio?.slice(0, 155) ||
    `${profile.displayName} on ${site.name}: ${profile.canSell ? "game accounts, currency, items and top-ups" : "League of Legends boosting"}${
      rating ? `, rated ${rating}/5 from ${profile.ratingCount} review${profile.ratingCount === 1 ? "" : "s"}` : ""
    }. Escrow-protected orders.`;
  return {
    title: `${profile.displayName} — Seller`,
    description,
    alternates: { canonical: `/sellers/${profile.slug}` },
    openGraph: { title: `${profile.displayName} — Seller on ${site.name}`, description, url: `/sellers/${profile.slug}` },
  };
}

function maskName(name: string) {
  const clean = name.trim();
  if (clean.length <= 2) return `${clean[0] ?? "?"}***`;
  return `${clean.slice(0, 2)}***${clean.slice(-1)}`;
}

export default async function SellerStorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile || profile.status !== "APPROVED") notFound();

  const [listings, listingCount, reviews] = await Promise.all([
    db.listing.findMany({
      where: { sellerId: profile.id, status: "ACTIVE" },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 24,
      select: listingCardSelect,
    }),
    db.listing.count({ where: { sellerId: profile.id, status: "ACTIVE" } }),
    db.review.findMany({
      where: { sellerId: profile.id, isHidden: false },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, rating: true, comment: true, createdAt: true, author: { select: { name: true } }, order: { select: { gameName: true, type: true } } },
    }),
  ]);
  const rating = ratingOf(profile.ratingSum, profile.ratingCount);

  return (
    <div className="mx-auto max-w-[1320px] px-4 pt-10 sm:px-6 sm:pt-14">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-3">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink-2">Sellers</span>
        <span className="mx-2">/</span>
        <span className="text-ink-2">{profile.displayName}</span>
      </nav>

      <header className="panel relative overflow-hidden p-6 sm:p-8">
        <div className="side-art-soft absolute inset-x-0 top-0 h-1.5" aria-hidden />
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <Avatar name={profile.displayName} src={profile.avatarUrl} size={84} className="rounded-[16px]" />
            <div className="min-w-0">
              <h1 className="t-display t-extrude text-5xl leading-none text-ink uppercase sm:text-6xl">{profile.displayName}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
                {[profile.canSell ? "Seller" : null, profile.canBoost ? "Booster" : null].filter(Boolean).join(" · ")}
                <span className="text-ink-3">Member since {formatDate(profile.reviewedAt ?? profile.createdAt)}</span>
              </p>
            </div>
          </div>

          {/* Real numbers only: rating, completed orders, live listings. */}
          <dl className="grid grid-cols-3 gap-3 md:min-w-[26rem]">
            <div className="rounded-[12px] bg-cab-3 px-4 py-3">
              <dt className="text-[0.75rem] text-ink-3">Rating</dt>
              <dd className="mt-1">
                {rating ? (
                  <>
                    <span className="t-display text-3xl leading-none text-ink tnum">{rating}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-[0.75rem] text-ink-3">
                      <Stars value={rating} /> {profile.ratingCount}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-ink-2">No reviews yet</span>
                )}
              </dd>
            </div>
            <div className="rounded-[12px] bg-cab-3 px-4 py-3">
              <dt className="text-[0.75rem] text-ink-3">Completed</dt>
              <dd className="t-display mt-1 text-3xl leading-none text-ink tnum">{profile.completedOrders}</dd>
            </div>
            <div className="rounded-[12px] bg-cab-3 px-4 py-3">
              <dt className="text-[0.75rem] text-ink-3">Live listings</dt>
              <dd className="t-display mt-1 text-3xl leading-none text-ink tnum">{listingCount}</dd>
            </div>
          </dl>
        </div>
        {profile.bio ? <p className="mt-6 max-w-[70ch] leading-relaxed whitespace-pre-line text-ink-2">{profile.bio}</p> : null}
      </header>

      <section className="mt-12" aria-labelledby="listings-h">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id="listings-h" className="t-display text-4xl text-ink uppercase">
            Listings
          </h2>
          {listingCount > listings.length ? (
            <span className="text-sm text-ink-3">
              Showing {listings.length} of {listingCount}
            </span>
          ) : null}
        </div>
        {listings.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((l) => (
              <ListingCard key={l.slug} listing={l} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing for sale right now">
            {profile.canBoost && !profile.canSell
              ? `${profile.displayName} takes boosting orders. Order a boost and an approved booster like them claims it.`
              : "Check back later, or browse the marketplace for similar listings."}
          </EmptyState>
        )}
      </section>

      <section className="mt-14" aria-labelledby="reviews-h">
        <h2 id="reviews-h" className="t-display text-4xl text-ink uppercase">
          Reviews
        </h2>
        {reviews.length ? (
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id} className="panel-flat p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5">
                    <Stars value={r.rating} />
                    <span className="text-sm text-ink-2">{maskName(r.author.name)}</span>
                  </span>
                  <span className="text-[0.75rem] text-ink-3">{timeAgo(r.createdAt)}</span>
                </div>
                {r.comment ? <p className="mt-2.5 text-sm leading-relaxed text-ink-2">{r.comment}</p> : null}
                <p className="mt-2.5 text-[0.75rem] text-ink-3">
                  {r.order.gameName} · {r.order.type === "BOOST" ? "Boosting" : "Marketplace"} order
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No reviews yet" className="mt-5">
            Buyers can review {profile.displayName} after a completed order.
          </EmptyState>
        )}
      </section>
    </div>
  );
}

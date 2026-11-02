import { Clock, Gamepad2, Monitor, Server, ThumbsUp, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyBox } from "@/components/buy-box";
import { JsonLd } from "@/components/json-ld";
import { ListingCard, listingCardSelect } from "@/components/listing-card";
import { ListingGallery } from "@/components/listing-gallery";
import { ReportListing } from "@/components/report-listing";
import { Container, Crumbs, SectionHead } from "@/components/storefront";
import { Avatar } from "@/components/ui";
import { VerifiedBadge } from "@/components/verified-badge";
import { CATEGORIES, categoryFromSlug } from "@/lib/catalog";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";
import { categoryUrl, listingUrl, sellerUrl } from "@/lib/urls";
import { formatDate, isOnline, ratingPercent, timeAgo } from "@/lib/utils";
import { db } from "@/server/db";
import { availableStock } from "@/server/orders";
import { getCurrentUser } from "@/server/session";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ game: string; category: string; listing: string }> };

async function load(params: Props["params"]) {
  const { game, category: catSlug, listing: slug } = await params;
  const category = categoryFromSlug(catSlug);
  if (!category) return null;
  const listing = await db.listing.findUnique({
    where: { slug },
    include: { game: true, seller: { include: { user: { select: { lastSeenAt: true } } } } },
  });
  if (!listing || listing.game.slug !== game || listing.category !== category) return null;
  // Removed/rejected listings and listings of suspended sellers are gone for the public.
  if (["REMOVED", "REJECTED", "DRAFT", "PENDING"].includes(listing.status) || listing.seller.status !== "APPROVED") return null;
  return listing;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await load(params);
  if (!listing) return { robots: { index: false } };
  return pageMeta({
    title: `${listing.title} · ${listing.game.name} ${CATEGORIES[listing.category].singular}`,
    description: listing.description.replace(/\s+/g, " ").slice(0, 155),
    path: listingUrl(listing),
    noindex: listing.status !== "ACTIVE",
  });
}

function deliveryText(method: string, minutes: number) {
  if (method === "INSTANT") return "Instant delivery after payment";
  if (minutes < 60) return `Delivered within ${minutes} minutes`;
  const h = Math.round(minutes / 60);
  return h < 24 ? `Delivered within ${h} hour${h === 1 ? "" : "s"}` : `Delivered within ${Math.round(h / 24)} days`;
}

export default async function ListingPage({ params }: Props) {
  const listing = await load(params);
  if (!listing) notFound();
  const [user, stock, more] = await Promise.all([
    getCurrentUser(),
    availableStock(listing),
    db.listing.findMany({
      where: { sellerId: listing.sellerId, status: "ACTIVE", id: { not: listing.id } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: listingCardSelect,
    }),
  ]);
  // Count a view (best effort, never blocks rendering).
  db.listing.update({ where: { id: listing.id }, data: { views: { increment: 1 } } }).catch(() => {});

  const url = listingUrl(listing);
  const cat = CATEGORIES[listing.category];
  const attrs = listing.attributes && typeof listing.attributes === "object" && !Array.isArray(listing.attributes) ? Object.entries(listing.attributes as Record<string, unknown>) : [];
  const pct = ratingPercent(listing.seller.ratingSum, listing.seller.ratingCount);
  const seen = listing.seller.user.lastSeenAt;
  const own = user?.sellerProfile?.id === listing.sellerId;
  const disabledReason =
    listing.status !== "ACTIVE" || stock < listing.minQuantity ? "This offer is sold out or paused." : own ? "This is your own listing." : null;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: listing.game.name, path: `/${listing.game.slug}` },
            { name: cat.label, path: categoryUrl(listing.game.slug, listing.category) },
            { name: listing.title, path: url },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: listing.title,
            description: listing.description.slice(0, 500),
            category: `${listing.game.name} ${cat.singular}`,
            ...(listing.images.length ? { image: listing.images.map((i) => (i.startsWith("http") ? i : absoluteUrl(i))) } : {}),
            offers: {
              "@type": "Offer",
              price: (listing.price / 100).toFixed(2),
              priceCurrency: site.currency,
              availability: disabledReason && !own ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
              url: absoluteUrl(url),
              seller: { "@type": "Organization", name: listing.seller.displayName },
            },
          },
        ]}
      />
      <Container className="py-10">
        <Crumbs
          items={[
            { name: "Home", href: "/" },
            { name: listing.game.name, href: `/${listing.game.slug}` },
            { name: cat.label, href: categoryUrl(listing.game.slug, listing.category) },
            { name: listing.title.length > 48 ? `${listing.title.slice(0, 48)}…` : listing.title },
          ]}
        />
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            <ListingGallery images={listing.images} title={listing.title} game={listing.game} />

            <h1 className="mt-6 text-2xl leading-snug font-semibold text-ink sm:text-[1.75rem]">{listing.title}</h1>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2">
              <li className="flex items-center gap-1.5">
                <Gamepad2 className="size-4 text-ink-3" />
                {listing.game.name} · {cat.singular}
              </li>
              {listing.server ? (
                <li className="flex items-center gap-1.5">
                  <Server className="size-4 text-ink-3" />
                  {listing.server}
                </li>
              ) : null}
              {listing.platform ? (
                <li className="flex items-center gap-1.5">
                  <Monitor className="size-4 text-ink-3" />
                  {listing.platform}
                </li>
              ) : null}
              <li className="flex items-center gap-1.5">
                {listing.deliveryMethod === "INSTANT" ? <Zap className="size-4 text-phosphor" /> : <Clock className="size-4 text-ink-3" />}
                {deliveryText(listing.deliveryMethod, listing.deliveryTime)}
              </li>
            </ul>

            {attrs.length ? (
              <dl className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {attrs.map(([k, v]) => (
                  <div key={k} className="rounded-[12px] border border-cab-4 bg-cab-2 px-4 py-3">
                    <dt className="text-[0.75rem] text-ink-3">{k}</dt>
                    <dd className="mt-0.5 font-medium text-ink">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <section className="mt-8" aria-labelledby="desc-h">
              <h2 id="desc-h" className="t-display text-3xl text-ink uppercase">
                Description
              </h2>
              <p className="mt-3 max-w-[72ch] leading-relaxed whitespace-pre-line text-ink-2">{listing.description}</p>
            </section>
            <div className="mt-8">
              <ReportListing listingId={listing.id} signedIn={!!user} />
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <BuyBox
              listingId={listing.id}
              price={listing.price}
              unitLabel={listing.unitLabel}
              minQuantity={listing.minQuantity}
              stock={stock}
              returnTo={url}
              disabledReason={disabledReason}
            />
            <Link href={sellerUrl(listing.seller.slug)} className="panel-flat flex items-center gap-3.5 p-4 transition-colors hover:border-cab-5">
              <span className="relative shrink-0">
                <Avatar name={listing.seller.displayName} src={listing.seller.avatarUrl} size={48} className="rounded-[12px]" />
                {isOnline(seen) ? <span className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full bg-ok ring-[3px] ring-cab-2" title="Online now" /> : null}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-medium text-ink">
                  <span className="truncate">{listing.seller.displayName}</span>
                  {listing.seller.verified ? <VerifiedBadge /> : null}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-ink-3 tnum">
                  <span>{listing.seller.completedOrders} completed</span>
                  {pct ? (
                    <span className="inline-flex items-center gap-1 text-ok">
                      <ThumbsUp className="size-3.5" aria-hidden /> {pct}% · {listing.seller.ratingCount} reviews
                    </span>
                  ) : (
                    <span>No reviews yet</span>
                  )}
                </p>
                <p className="text-[0.75rem] text-ink-3">
                  {isOnline(seen) ? "Online now" : seen ? `Last seen ${timeAgo(seen)}` : `Seller since ${formatDate(listing.seller.reviewedAt ?? listing.seller.createdAt)}`}
                </p>
              </div>
            </Link>
          </aside>
        </div>

        {more.length ? (
          <section className="mt-16" aria-labelledby="more-h">
            <SectionHead id="more-h" title={`More from ${listing.seller.displayName}`} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {more.map((l) => (
                <ListingCard key={l.slug} listing={l} />
              ))}
            </div>
          </section>
        ) : null}
      </Container>
    </>
  );
}

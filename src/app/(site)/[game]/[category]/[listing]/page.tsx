import { Clock, Gamepad2, Server, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyBox } from "@/components/buy-box";
import { JsonLd } from "@/components/json-ld";
import { ListingCard, listingCardSelect } from "@/components/listing-card";
import { ReportListing } from "@/components/report-listing";
import { Container, Crumbs, SectionHead } from "@/components/storefront";
import { Avatar, Stars } from "@/components/ui";
import { CATEGORIES, categoryFromSlug } from "@/lib/catalog";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";
import { categoryUrl, listingUrl, sellerUrl } from "@/lib/urls";
import { formatDate, ratingOf } from "@/lib/utils";
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
    include: { game: true, seller: true },
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
  const rating = ratingOf(listing.seller.ratingSum, listing.seller.ratingCount);
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
            <Gallery images={listing.images} title={listing.title} color={listing.game.color} mono={listing.game.shortName ?? listing.game.name} />

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
              <Avatar name={listing.seller.displayName} src={listing.seller.avatarUrl} size={44} />
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{listing.seller.displayName}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-ink-3">
                  {rating ? (
                    <>
                      <Stars value={rating} /> {rating} ({listing.seller.ratingCount})
                    </>
                  ) : (
                    "No reviews yet"
                  )}
                  <span>· {listing.seller.completedOrders} completed</span>
                </p>
                <p className="text-[0.75rem] text-ink-3">Approved seller since {formatDate(listing.seller.reviewedAt ?? listing.seller.createdAt)}</p>
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

function Gallery({ images, title, color, mono }: { images: string[]; title: string; color: string; mono: string }) {
  if (!images.length) {
    return (
      <div
        className="flex h-28 items-end justify-between overflow-hidden rounded-[16px] border border-black px-5 pb-3"
        style={{ background: `linear-gradient(100deg, ${color} 0%, color-mix(in oklab, ${color} 35%, #100f0e) 70%)` }}
      >
        <span className="text-[0.8125rem] text-white/80">The seller hasn&apos;t added screenshots.</span>
        <span className="t-display text-6xl leading-none text-white uppercase" style={{ textShadow: "3px 3px 0 rgb(0 0 0 / 0.45)" }}>
          {mono}
        </span>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <a href={images[0]} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-[16px] border border-cab-4 bg-cab-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0]} alt={title} className="aspect-[16/9] w-full object-cover" />
      </a>
      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {images.slice(1).map((src, i) => (
            <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-[10px] border border-cab-4 bg-cab-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${title}, image ${i + 2}`} loading="lazy" className="aspect-[4/3] w-full object-cover transition-opacity hover:opacity-80" />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

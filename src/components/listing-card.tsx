import { Zap } from "lucide-react";
import Link from "next/link";
import { CATEGORIES, type ListingCategoryKey } from "@/lib/catalog";
import { listingUrl } from "@/lib/urls";
import { cn, formatMoney, ratingOf } from "@/lib/utils";
import { Avatar, Stars } from "./ui";

export type ListingCardData = {
  slug: string;
  title: string;
  category: ListingCategoryKey | string;
  price: number;
  unitLabel: string | null;
  images: string[];
  server: string | null;
  deliveryMethod: string;
  deliveryTime: number;
  attributes: unknown;
  game: { slug: string; name: string; shortName: string | null; color: string };
  seller: { displayName: string; slug: string; avatarUrl: string | null; ratingSum: number; ratingCount: number; completedOrders: number };
};

/** "$2,000,000,000" → "$2B": long numbers are compacted, never broken across lines. */
export function compactValue(value: string) {
  const m = value.match(/^(\D*?)(\d[\d,. ]*\d|\d)(\D*)$/);
  if (!m) return value;
  const digits = m[2].replace(/[,\s]/g, "");
  const n = Number(digits);
  if (!Number.isFinite(n) || digits.replace(".", "").length < 7) return value;
  const short = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  return `${m[1]}${short}${m[3]}`;
}

/** Pick up to three attribute pairs to show on the card. */
export function attributePairs(attrs: unknown, limit = 3): [string, string][] {
  if (!attrs || typeof attrs !== "object" || Array.isArray(attrs)) return [];
  return Object.entries(attrs as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .slice(0, limit)
    .map(([k, v]) => [k, compactValue(String(v))]);
}

function deliveryLabel(method: string, minutes: number) {
  if (method === "INSTANT") return "Instant";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.round(minutes / 60);
  return h < 24 ? `${h} h` : `${Math.round(h / 24)} d`;
}

export function ListingCard({ listing, className }: { listing: ListingCardData; className?: string }) {
  const cover = listing.images[0];
  const pairs = attributePairs(listing.attributes);
  const rating = ratingOf(listing.seller.ratingSum, listing.seller.ratingCount);
  const cat = CATEGORIES[listing.category as ListingCategoryKey];

  return (
    <Link
      href={listingUrl({ slug: listing.slug, category: listing.category, game: listing.game })}
      className={cn(
        "group cursor-frame panel-flat flex flex-col overflow-hidden transition-[transform,border-color] duration-200 [--cursor:var(--color-p1)] hover:-translate-y-0.5 hover:border-cab-5",
        className,
      )}
    >
      <div className={cn("relative overflow-hidden bg-cab-3", cover ? "aspect-[16/10]" : "h-[68px]")}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          /* No screenshots: a cartridge-label band in the game's color instead of an empty frame. */
          <div
            className="flex size-full items-end justify-end px-3 pb-1.5"
            style={{ background: `linear-gradient(100deg, ${listing.game.color} 0%, color-mix(in oklab, ${listing.game.color} 35%, #100f0e) 75%)` }}
          >
            <span className="t-display text-3xl leading-none text-white uppercase" style={{ textShadow: "2px 2px 0 rgb(0 0 0 / 0.45)" }}>
              {listing.game.shortName ?? listing.game.name.slice(0, 3)}
            </span>
          </div>
        )}
        <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
          <span className="chip chip-plain border-black/40 bg-black/70 text-ink">
            {[listing.server, cat?.singular].filter(Boolean).join(" · ")}
          </span>
          <span className={cn("chip border-black/40 bg-black/70", listing.deliveryMethod === "INSTANT" ? "text-phosphor" : "text-ink-2")}>
            {listing.deliveryMethod === "INSTANT" ? <Zap className="-ml-0.5 size-3" aria-hidden /> : null}
            {deliveryLabel(listing.deliveryMethod, listing.deliveryTime)}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-[0.9375rem] leading-snug font-medium text-ink">{listing.title}</h3>
        {pairs.length ? (
          <dl className="mt-3 grid grid-cols-3 gap-2">
            {pairs.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="truncate text-[0.6875rem] text-ink-3">{k}</dt>
                <dd className={cn("text-sm leading-snug text-ink-2", /\d/.test(v) ? "truncate tnum" : "line-clamp-2")} title={v}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={listing.seller.displayName} src={listing.seller.avatarUrl} size={26} />
            <div className="min-w-0">
              <p className="truncate text-[0.8125rem] text-ink-2">{listing.seller.displayName}</p>
              <p className="flex items-center gap-1.5 text-[0.6875rem] text-ink-3">
                {rating ? <Stars value={rating} /> : <span>New seller</span>}
                {listing.seller.completedOrders ? <span className="tnum">· {listing.seller.completedOrders} sold</span> : null}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="t-display text-[1.9rem] leading-none text-ink tnum">{formatMoney(listing.price)}</p>
            {listing.unitLabel ? <p className="mt-0.5 text-[0.6875rem] text-ink-3">per {listing.unitLabel}</p> : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Prisma `select` that satisfies ListingCardData. */
export const listingCardSelect = {
  slug: true,
  title: true,
  category: true,
  price: true,
  unitLabel: true,
  images: true,
  server: true,
  deliveryMethod: true,
  deliveryTime: true,
  attributes: true,
  game: { select: { slug: true, name: true, shortName: true, color: true } },
  seller: { select: { displayName: true, slug: true, avatarUrl: true, ratingSum: true, ratingCount: true, completedOrders: true } },
} as const;

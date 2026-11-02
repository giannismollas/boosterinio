import { ArrowRight, Clock, Globe, Images, Monitor, ThumbsUp, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { CATEGORIES, type ListingCategoryKey } from "@/lib/catalog";
import { listingUrl } from "@/lib/urls";
import { cn, formatMoney, ratingPercent } from "@/lib/utils";
import { Avatar } from "./ui";
import { VerifiedBadge } from "./verified-badge";

export type ListingCardData = {
  slug: string;
  title: string;
  description: string;
  category: ListingCategoryKey | string;
  price: number;
  unitLabel: string | null;
  images: string[];
  server: string | null;
  platform: string | null;
  deliveryMethod: string;
  deliveryTime: number;
  attributes: unknown;
  game: { slug: string; name: string; shortName: string | null; color: string; imageUrl: string | null };
  seller: {
    displayName: string;
    slug: string;
    avatarUrl: string | null;
    verified: boolean;
    ratingSum: number;
    ratingCount: number;
    completedOrders: number;
  };
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

/** Pick up to `limit` attribute pairs to show on the card. */
export function attributePairs(attrs: unknown, limit = 3): [string, string][] {
  if (!attrs || typeof attrs !== "object" || Array.isArray(attrs)) return [];
  return Object.entries(attrs as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .slice(0, limit)
    .map(([k, v]) => [k, compactValue(String(v))]);
}

export function deliveryLabel(method: string, minutes: number) {
  if (method === "INSTANT") return "Instant";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.round(minutes / 60);
  return h < 24 ? `${h} h` : `${Math.round(h / 24)} d`;
}

/** The detail chips under the photo: delivery time, server, platform, then key details ("57 Level", "Diamond IV"). */
function cardChips(l: ListingCardData) {
  const out: { label: string; Icon?: LucideIcon }[] = [];
  if (l.deliveryMethod !== "INSTANT") out.push({ label: deliveryLabel(l.deliveryMethod, l.deliveryTime), Icon: Clock });
  if (l.server) out.push({ label: l.server, Icon: Globe });
  if (l.platform) out.push({ label: l.platform, Icon: Monitor });
  for (const [k, v] of attributePairs(l.attributes, 4)) out.push({ label: /^[$€£]?\d[\d.,]*[kmb]?$/i.test(v) ? `${v} ${k}` : v });
  return out;
}

/** First lines of the description, flattened for the card. */
function excerpt(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 180);
}

export function ListingCard({ listing, className }: { listing: ListingCardData; className?: string }) {
  const photos = listing.images;
  const cover = photos[0];
  const chips = cardChips(listing);
  const pct = ratingPercent(listing.seller.ratingSum, listing.seller.ratingCount);
  const cat = CATEGORIES[listing.category as ListingCategoryKey];
  const instant = listing.deliveryMethod === "INSTANT";
  const blurb = excerpt(listing.description);

  return (
    <Link
      href={listingUrl({ slug: listing.slug, category: listing.category, game: listing.game })}
      className={cn("group cursor-frame panel-flat flex h-full flex-col overflow-hidden transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-cab-5", className)}
    >
      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="flex items-center gap-2.5">
          <GameIcon game={listing.game} />
          <h3 className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold text-white" title={listing.title}>
            {listing.title}
          </h3>
          {instant ? <Zap className="size-4 shrink-0 fill-p1 text-p1" aria-label="Instant delivery" /> : null}
        </div>
        <p className="line-clamp-2 min-h-[2.4em] text-[0.8125rem] leading-[1.2rem] text-ink-3">{blurb || `${listing.game.name} · ${cat?.singular ?? "Listing"}`}</p>

        <div className="relative aspect-[16/10] overflow-hidden rounded-[12px] border border-white/[0.06] bg-cab-3">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          ) : (
            <GameArt game={listing.game} />
          )}
          <span className="chip chip-plain absolute top-2 left-2 border-white/10 bg-black/65 text-white">{cat?.singular ?? "Listing"}</span>
          {photos.length > 1 ? (
            <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-[8px] bg-black/70 px-2 py-1 text-[0.75rem] font-medium text-white tnum">
              <Images className="size-3.5" aria-hidden />
              {photos.length}
            </span>
          ) : null}
        </div>

        {chips.length ? (
          <ul className="no-scrollbar -mx-3.5 flex gap-1.5 overflow-x-auto px-3.5" aria-label="Details">
            {chips.map((c, i) => (
              <li key={i} className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[8px] border border-cab-4 bg-cab-3 px-2.5 text-[0.75rem] whitespace-nowrap text-ink-2">
                {c.Icon ? <c.Icon className="size-3.5 text-ink-3" aria-hidden /> : null}
                {c.label}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <div className="min-w-0">
            <p className="t-display text-[1.75rem] leading-none text-white tnum">{formatMoney(listing.price)}</p>
            {listing.unitLabel ? <p className="mt-1 truncate text-[0.6875rem] text-ink-3">per {listing.unitLabel}</p> : null}
          </div>
          <span className="btn btn-p1 btn-sm shrink-0 gap-1.5">
            Buy now <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-t border-white/[0.06] bg-black/20 px-3.5 py-2.5">
        <Avatar name={listing.seller.displayName} src={listing.seller.avatarUrl} size={28} />
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate text-[0.8125rem] font-medium text-ink-2">{listing.seller.displayName}</span>
          {listing.seller.verified ? <VerifiedBadge className="size-3.5" /> : null}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[0.75rem] text-ink-3 tnum">
          {listing.seller.completedOrders ? `${listing.seller.completedOrders} orders` : "New seller"}
          {pct ? (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1 text-ok">
                <ThumbsUp className="size-3" aria-hidden />
                {pct}%
              </span>
            </>
          ) : null}
        </span>
      </div>
    </Link>
  );
}

/** The game's cover as a small rounded icon (its color and initials without one). */
export function GameIcon({ game, className }: { game: ListingCardData["game"]; className?: string }) {
  return game.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={game.imageUrl} alt="" className={cn("size-7 shrink-0 rounded-[8px] object-cover", className)} />
  ) : (
    <span
      className={cn("grid size-7 shrink-0 place-items-center rounded-[8px] font-display text-[0.625rem] text-white", className)}
      style={{ background: game.color }}
      aria-hidden
    >
      {(game.shortName ?? game.name).slice(0, 3)}
    </span>
  );
}

/** Stand-in when the seller hasn't added photos: the game's art, dimmed, labeled as such. */
export function GameArt({ game, big = false }: { game: ListingCardData["game"]; big?: boolean }) {
  return (
    <>
      {game.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={game.imageUrl} alt="" loading="lazy" className="size-full object-cover opacity-50 saturate-[0.8] transition-transform duration-300 group-hover:scale-[1.03]" />
      ) : (
        <span className="block size-full" style={{ background: `linear-gradient(100deg, ${game.color} 0%, color-mix(in oklab, ${game.color} 35%, #0b0b16) 75%)` }} />
      )}
      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgb(11_11_22/0.1)_20%,rgb(11_11_22/0.88))]" aria-hidden />
      <span className={cn("absolute bottom-2 left-2.5 text-white/75", big ? "text-sm" : "text-[0.6875rem]")}>No photos yet</span>
      <span className={cn("t-display absolute right-2.5 bottom-1.5 leading-none text-white", big ? "text-6xl" : "text-[1.875rem]")}>
        {game.shortName ?? game.name.slice(0, 3)}
      </span>
    </>
  );
}

/** Prisma `select` that satisfies ListingCardData. */
export const listingCardSelect = {
  slug: true,
  title: true,
  description: true,
  category: true,
  price: true,
  unitLabel: true,
  images: true,
  server: true,
  platform: true,
  deliveryMethod: true,
  deliveryTime: true,
  attributes: true,
  game: { select: { slug: true, name: true, shortName: true, color: true, imageUrl: true } },
  seller: { select: { displayName: true, slug: true, avatarUrl: true, verified: true, ratingSum: true, ratingCount: true, completedOrders: true } },
} as const;

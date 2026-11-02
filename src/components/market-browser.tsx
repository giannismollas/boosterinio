import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import { pageParam, parseMoney, str } from "@/lib/utils";
import { db } from "@/server/db";
import { ListingCard, listingCardSelect } from "./listing-card";
import { EmptyState, Pagination } from "./ui";

export type SearchParams = Record<string, string | string[] | undefined>;

const SORTS = {
  recommended: { label: "Recommended", orderBy: [{ featured: "desc" }, { soldCount: "desc" }, { createdAt: "desc" }] },
  newest: { label: "Newest", orderBy: [{ createdAt: "desc" }] },
  "price-asc": { label: "Price: low to high", orderBy: [{ price: "asc" }] },
  "price-desc": { label: "Price: high to low", orderBy: [{ price: "desc" }] },
} satisfies Record<string, { label: string; orderBy: Prisma.ListingOrderByWithRelationInput[] }>;

const PER_PAGE = 24;

/**
 * Listing grid with GET-form filters (works without JavaScript, crawlable).
 * `base` scopes the query (game and/or category); `basePath` builds links.
 */
export async function MarketBrowser({
  base,
  basePath,
  searchParams,
  servers = [],
  games,
  emptyAction,
}: {
  base: Prisma.ListingWhereInput;
  basePath: string;
  searchParams: SearchParams;
  servers?: string[];
  games?: { slug: string; name: string }[];
  emptyAction?: React.ReactNode;
}) {
  const q = str(searchParams.q).trim().slice(0, 80);
  const server = str(searchParams.server);
  const game = str(searchParams.game);
  const instant = str(searchParams.instant) === "1";
  const min = parseMoney(str(searchParams.min));
  const max = parseMoney(str(searchParams.max));
  const sortKey = (str(searchParams.sort) || "recommended") as keyof typeof SORTS;
  const sort = SORTS[sortKey] ?? SORTS.recommended;
  const page = pageParam(searchParams.page);

  const where: Prisma.ListingWhereInput = {
    ...base,
    status: "ACTIVE",
    seller: { status: "APPROVED", canSell: true },
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    ...(server ? { server } : {}),
    ...(game ? { game: { slug: game } } : {}),
    ...(instant ? { deliveryMethod: "INSTANT" } : {}),
    ...(min !== null || max !== null ? { price: { ...(min !== null ? { gte: min } : {}), ...(max !== null ? { lte: max } : {}) } } : {}),
  };

  const [total, listings] = await Promise.all([
    db.listing.count({ where }),
    db.listing.findMany({ where, orderBy: sort.orderBy, skip: (page - 1) * PER_PAGE, take: PER_PAGE, select: listingCardSelect }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const filtered = !!(q || server || game || instant || min !== null || max !== null);

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, server, game, instant: instant ? "1" : "", min: str(searchParams.min), max: str(searchParams.max), sort: sortKey === "recommended" ? "" : sortKey })) {
      if (v) sp.set(k, v);
    }
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <div>
      <form method="get" action={basePath} className="panel-flat mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_repeat(4,minmax(0,1fr))_auto] lg:items-end">
        <div>
          <label className="label" htmlFor="f-q">
            Search
          </label>
          <input id="f-q" name="q" defaultValue={q} className="field" placeholder="Rank, skin, item name…" />
        </div>
        {games ? (
          <div>
            <label className="label" htmlFor="f-game">
              Game
            </label>
            <select id="f-game" name="game" defaultValue={game} className="field">
              <option value="">All games</option>
              {games.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="f-server">
              Server
            </label>
            <select id="f-server" name="server" defaultValue={server} className="field">
              <option value="">Any server</option>
              {servers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="f-min">
              Min €
            </label>
            <input id="f-min" name="min" inputMode="decimal" defaultValue={str(searchParams.min)} className="field" placeholder="0" />
          </div>
          <div>
            <label className="label" htmlFor="f-max">
              Max €
            </label>
            <input id="f-max" name="max" inputMode="decimal" defaultValue={str(searchParams.max)} className="field" placeholder="Any" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="f-sort">
            Sort
          </label>
          <select id="f-sort" name="sort" defaultValue={sortKey} className="field">
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex h-11 items-center gap-2.5 text-sm text-ink-2">
          <input type="checkbox" name="instant" value="1" defaultChecked={instant} className="size-4 accent-[#5cf2d6]" />
          Instant delivery
        </label>
        <button type="submit" className="btn btn-p2">
          <SlidersHorizontal className="size-4" />
          Apply
        </button>
      </form>

      <div className="mb-4 flex items-center justify-between text-sm text-ink-3">
        <p className="tnum">
          {total} {total === 1 ? "offer" : "offers"}
          {filtered ? " match your filters" : ""}
        </p>
        {filtered ? (
          <Link href={basePath} className="text-phosphor hover:underline">
            Clear filters
          </Link>
        ) : null}
      </div>

      {listings.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((l) => (
            <ListingCard key={l.slug} listing={l} />
          ))}
        </div>
      ) : (
        <EmptyState title={filtered ? "No matches" : "No offers yet"} action={emptyAction}>
          {filtered
            ? "Nothing matches these filters. Widen the price range or clear the filters."
            : "Approved sellers haven't listed anything here yet. Check back soon, or open a shop yourself."}
        </EmptyState>
      )}
      <Pagination page={page} pageCount={pageCount} href={href} />
    </div>
  );
}

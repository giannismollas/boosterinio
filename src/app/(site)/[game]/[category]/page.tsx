import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { MarketBrowser } from "@/components/market-browser";
import { Container, Crumbs } from "@/components/storefront";
import { CATEGORIES, categoryFromSlug, categoryLabel, type ListingCategoryKey, gameHeadingName } from "@/lib/catalog";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { categoryUrl } from "@/lib/urls";
import { pageParam } from "@/lib/utils";
import { getGame } from "@/server/catalog";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ game: string; category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function label(category: ListingCategoryKey, game: { currencyName: string | null; topupName: string | null }) {
  return categoryLabel(category, game);
}

async function load(params: Props["params"]) {
  const { game: gameSlug, category: catSlug } = await params;
  const category = categoryFromSlug(catSlug);
  if (!category) return null;
  const game = await getGame(gameSlug);
  if (!game || !game.categories.includes(category)) return null;
  return { game, category };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const { game, category } = data;
  const page = pageParam((await searchParams).page);
  const what = label(category, game);
  const meta = pageMeta({
    title: `${game.name} ${what} for Sale${page > 1 ? ` (page ${page})` : ""}`,
    description: `Buy ${game.name} ${what.toLowerCase()} from approved sellers on Boosterinio. ${CATEGORIES[category].blurb} Escrow-protected payment on every order.`,
    path: `${categoryUrl(game.slug, category)}${page > 1 ? `?page=${page}` : ""}`,
  });
  return meta;
}

export default async function GameCategoryPage({ params, searchParams }: Props) {
  const data = await load(params);
  if (!data) notFound();
  const { game, category } = data;
  const sp = await searchParams;
  const what = label(category, game);
  const path = categoryUrl(game.slug, category);

  return (
    <Container className="py-10">
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: game.name, path: `/${game.slug}` },
          { name: what, path },
        ])}
      />
      <Crumbs items={[{ name: "Home", href: "/" }, { name: game.name, href: `/${game.slug}` }, { name: what }]} />
      <h1 className="t-display text-5xl text-ink uppercase sm:text-6xl">
        {gameHeadingName(game)} {what}
      </h1>
      <p className="mt-2 max-w-[62ch] text-ink-2">
        {CATEGORIES[category].blurb} Payment stays in escrow until you confirm delivery.
      </p>
      <nav aria-label={`${game.name} categories`} className="no-scrollbar -mx-4 mt-6 mb-8 flex gap-1.5 overflow-x-auto px-4">
        {game.boostingEnabled ? (
          <Link href={`/${game.slug}/boosting`} className="inline-flex h-10 shrink-0 items-center rounded-[10px] bg-cab-2 px-3.5 text-sm text-ink-2 hover:bg-cab-3 hover:text-ink">
            Boosting
          </Link>
        ) : null}
        {game.categories.map((c) => (
          <Link
            key={c}
            href={categoryUrl(game.slug, c)}
            aria-current={c === category ? "page" : undefined}
            className={
              c === category
                ? "inline-flex h-10 shrink-0 items-center rounded-[10px] bg-p2 px-3.5 text-sm text-white shadow-[0_0_0_1px_rgb(0_0_0/0.6),0_0_16px_-4px_rgb(47_107_255/0.7)]"
                : "inline-flex h-10 shrink-0 items-center rounded-[10px] bg-cab-2 px-3.5 text-sm text-ink-2 hover:bg-cab-3 hover:text-ink"
            }
          >
            {label(c, game)}
          </Link>
        ))}
      </nav>
      <MarketBrowser
        base={{ gameId: game.id, category }}
        basePath={path}
        searchParams={sp}
        servers={game.servers}
        emptyAction={
          <Link href="/sell" className="btn btn-p2">
            Sell {gameHeadingName(game)} {what.toLowerCase()}
          </Link>
        }
      />
    </Container>
  );
}

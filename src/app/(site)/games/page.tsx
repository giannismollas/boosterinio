import { Search } from "lucide-react";
import { GameTile } from "@/components/game-tile";
import { JsonLd } from "@/components/json-ld";
import { Container, Crumbs } from "@/components/storefront";
import { EmptyState } from "@/components/ui";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { str } from "@/lib/utils";
import { getGames } from "@/server/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const games = await getGames();
  return pageMeta({
    title: "All games: boosting, accounts, currency & items",
    description: `Browse every game on Boosterinio. League of Legends boosting plus accounts, in-game currency, items, top-ups and gift cards for ${games.length} games.`,
    path: "/games",
  });
}

export default async function GamesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = str(sp.q).trim().toLowerCase();
  const games = await getGames();
  const shown = q ? games.filter((g) => g.name.toLowerCase().includes(q) || (g.shortName ?? "").toLowerCase().includes(q)) : games;
  const sorted = [...shown].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Container className="py-10">
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Games", path: "/games" }])} />
      <Crumbs items={[{ name: "Home", href: "/" }, { name: "Games" }]} />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="t-display text-5xl text-ink uppercase sm:text-6xl">Select your game</h1>
          <p className="mt-2 max-w-[60ch] text-ink-2">
            {games.length} games and counting. Boosting is live for League of Legends; every game has a marketplace for accounts, currency and items.
          </p>
        </div>
        <form method="get" action="/games" className="relative w-full max-w-sm" role="search">
          <label htmlFor="game-q" className="sr-only">
            Search games
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
          <input id="game-q" name="q" defaultValue={q} className="field pl-10" placeholder="Search games" />
        </form>
      </div>
      {sorted.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {sorted.map((g, i) => (
            <GameTile key={g.id} game={g} priority={i < 12} />
          ))}
        </div>
      ) : (
        <EmptyState title="Game not found">We don&apos;t list &ldquo;{q}&rdquo; yet. Ask support and we&apos;ll consider adding it.</EmptyState>
      )}
    </Container>
  );
}

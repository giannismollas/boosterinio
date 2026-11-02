import { startingPrice } from "@/lib/boosting/engine";
import { db } from "./db";
import { memo } from "./memo";

/** Active games for menus, select screens and the sitemap (cached 60s). */
export function getGames() {
  return memo("games:all", 60_000, () =>
    db.game.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  );
}

export async function getGame(slug: string) {
  const games = await getGames();
  return games.find((g) => g.slug === slug) ?? null;
}

/** Active boosting services of a game with their "from" price (cached 60s). */
export function getServices(gameId: string) {
  return memo(`services:${gameId}`, 60_000, async () => {
    const rows = await db.boostService.findMany({
      where: { gameId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map((s) => ({ ...s, fromPrice: startingPrice(s.calculator, s.config) }));
  });
}

/** Live listing counts per game+category (cached 60s). */
export function getListingCounts() {
  return memo("listings:counts", 60_000, async () => {
    const rows = await db.listing.groupBy({
      by: ["gameId", "category"],
      where: { status: "ACTIVE", seller: { status: "APPROVED" } },
      _count: { _all: true },
    });
    const map = new Map<string, number>();
    for (const r of rows) map.set(`${r.gameId}:${r.category}`, r._count._all);
    return map;
  });
}

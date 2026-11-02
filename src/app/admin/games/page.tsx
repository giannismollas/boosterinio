import type { Metadata } from "next";
import Link from "next/link";
import { TableWrap } from "@/components/admin/shared";
import { EmptyState, PageHeader, StatusChip } from "@/components/ui";
import { CATEGORIES } from "@/lib/catalog";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Games" };

export default async function AdminGamesPage() {
  await requireAdmin();
  const [games, live] = await Promise.all([
    db.game.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { services: true, listings: true } } },
    }),
    db.listing.groupBy({ by: ["gameId"], where: { status: "ACTIVE" }, _count: { _all: true } }),
  ]);
  const liveBy = new Map(live.map((l) => [l.gameId, l._count._all]));

  return (
    <>
      <PageHeader
        title="Games"
        description="Every game in the catalog. Turn on boosting for a game once it has an active service."
        actions={
          <Link href="/admin/games/new" className="btn btn-coin">
            Add game
          </Link>
        }
      />
      {games.length ? (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>Game</th>
                <th>Categories</th>
                <th>Boosting</th>
                <th className="text-right">Services</th>
                <th className="text-right">Live listings</th>
                <th className="text-right">Order</th>
                <th>Visibility</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id}>
                  <td>
                    <Link href={`/admin/games/${g.id}`} className="flex items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-[8px] font-display text-sm text-ink" style={{ background: g.color }} aria-hidden>
                        {(g.shortName ?? g.name).slice(0, 4)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink hover:text-phosphor">{g.name}</span>
                        <span className="block truncate text-[0.75rem] text-ink-3">/{g.slug}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="max-w-[260px] text-[0.8125rem] text-ink-2">{g.categories.map((c) => CATEGORIES[c].label).join(", ") || "—"}</td>
                  <td>{g.boostingEnabled ? <StatusChip tone="ok">Live</StatusChip> : <StatusChip tone="muted">Off</StatusChip>}</td>
                  <td className="text-right tnum">{g._count.services}</td>
                  <td className="text-right tnum">{liveBy.get(g.id) ?? 0}</td>
                  <td className="text-right text-ink-3 tnum">{g.sortOrder}</td>
                  <td>
                    <span className="flex flex-wrap gap-1.5">
                      {g.isActive ? <StatusChip tone="ok">Visible</StatusChip> : <StatusChip tone="muted">Hidden</StatusChip>}
                      {g.isFeatured ? <StatusChip tone="p2">Featured</StatusChip> : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <EmptyState title="No games yet" action={<Link href="/admin/games/new" className="btn btn-p2">Add game</Link>}>
          Run the database seed to load the launch catalog, or add games one by one.
        </EmptyState>
      )}
    </>
  );
}

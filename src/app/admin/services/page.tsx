import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar, FilterField, TableWrap } from "@/components/admin/shared";
import { EmptyState, PageHeader, StatusChip } from "@/components/ui";
import { startingPrice } from "@/lib/boosting/engine";
import { formatMoney, str } from "@/lib/utils";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Services & pricing" };

const CALC_LABEL = { RANK: "Rank ladder", WINS: "Wins / games", LEVEL: "Level range", HOURS: "Hourly", FIXED: "Packages" } as const;

export default async function AdminServicesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const gameId = str(sp.game);

  const [games, services] = await Promise.all([
    db.game.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, boostingEnabled: true, _count: { select: { services: true } } } }),
    db.boostService.findMany({
      where: gameId ? { gameId } : {},
      orderBy: [{ game: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      include: { game: { select: { name: true, slug: true, boostingEnabled: true } }, _count: { select: { orders: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Services & pricing"
        description="Boosting services and their price tables. Edits apply to new orders immediately; existing orders keep the price they were paid at."
        actions={
          <Link href={`/admin/services/new${gameId ? `?game=${gameId}` : ""}`} className="btn btn-coin">
            Add service
          </Link>
        }
      />
      <FilterBar resetHref="/admin/services">
        <FilterField label="Game">
          <select name="game" defaultValue={gameId} className="field min-w-56">
            <option value="">All games</option>
            {games
              .filter((g) => g._count.services > 0 || g.id === gameId)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
          </select>
        </FilterField>
      </FilterBar>

      {services.length ? (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Game</th>
                <th>Calculator</th>
                <th className="text-right">From</th>
                <th className="text-right">Orders</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => {
                const from = startingPrice(s.calculator, s.config);
                return (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/admin/services/${s.id}`} className="block font-medium text-ink hover:text-phosphor">
                        {s.name}
                      </Link>
                      <span className="text-[0.75rem] text-ink-3">
                        /{s.game.slug}/boosting/{s.slug}
                      </span>
                    </td>
                    <td className="text-ink-2">
                      {s.game.name}
                      {!s.game.boostingEnabled ? <span className="block text-[0.75rem] text-warn">Boosting off for this game</span> : null}
                    </td>
                    <td className="text-ink-2">{CALC_LABEL[s.calculator]}</td>
                    <td className="text-right tnum">{from === null ? <span className="text-bad">Invalid config</span> : formatMoney(from)}</td>
                    <td className="text-right tnum">{s._count.orders}</td>
                    <td>{s.isActive ? <StatusChip tone="ok">Active</StatusChip> : <StatusChip tone="muted">Off</StatusChip>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <EmptyState title="No services" action={<Link href="/admin/services/new" className="btn btn-p2">Add service</Link>}>
          {gameId ? "This game has no boosting services yet." : "Create a service to start selling boosts."}
        </EmptyState>
      )}
    </>
  );
}

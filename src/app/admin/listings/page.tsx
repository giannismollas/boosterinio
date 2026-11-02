import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar, FilterField, TableWrap } from "@/components/admin/shared";
import { EmptyState, LinkTabs, PageHeader, Pagination, StatusChip } from "@/components/ui";
import type { ListingCategory, ListingStatus, Prisma } from "@/generated/prisma/client";
import { CATEGORIES, CATEGORY_ORDER, LISTING_STATUS } from "@/lib/catalog";
import { formatMoney, pageParam, str, timeAgo } from "@/lib/utils";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Listings" };

const PER_PAGE = 25;
const TABS: ListingStatus[] = ["PENDING", "ACTIVE", "PAUSED", "REJECTED", "SOLD_OUT", "REMOVED"];

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const statusParam = str(sp.status) || "PENDING";
  const status = (TABS as string[]).includes(statusParam) ? (statusParam as ListingStatus) : undefined;
  const category = (CATEGORY_ORDER as string[]).includes(str(sp.category)) ? (str(sp.category) as ListingCategory) : undefined;
  const game = str(sp.game);
  const seller = str(sp.seller);
  const q = str(sp.q).trim();
  const page = pageParam(sp.page);

  const where: Prisma.ListingWhereInput = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(game ? { game: { slug: game } } : {}),
    ...(seller ? { sellerId: seller } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { seller: { displayName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [counts, total, listings, games] = await Promise.all([
    db.listing.groupBy({ by: ["status"], _count: { _all: true } }),
    db.listing.count({ where }),
    db.listing.findMany({
      where,
      orderBy: { updatedAt: status === "PENDING" ? "asc" : "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        game: { select: { name: true } },
        seller: { select: { displayName: true, status: true } },
        _count: { select: { reports: true } },
      },
    }),
    db.game.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);
  const countOf = (s: ListingStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;

  const href = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { status: statusParam, category, game: game || undefined, seller: seller || undefined, q: q || undefined, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    return `/admin/listings?${params.toString()}`;
  };

  return (
    <>
      <PageHeader title="Listings" description="Review new and edited listings before buyers see them. Oldest in review come first." />
      <LinkTabs
        current={status ?? "ALL"}
        items={[
          ...TABS.map((s) => ({ key: s, label: LISTING_STATUS[s].label, count: countOf(s), href: href({ status: s, page: undefined }) })),
          { key: "ALL", label: "All", href: href({ status: "ALL", page: undefined }) },
        ]}
      />
      <FilterBar resetHref="/admin/listings">
        <input type="hidden" name="status" value={statusParam} />
        {seller ? <input type="hidden" name="seller" value={seller} /> : null}
        <FilterField label="Search" className="min-w-[220px] flex-1">
          <input name="q" defaultValue={q} placeholder="Title or seller" className="field" />
        </FilterField>
        <FilterField label="Game">
          <select name="game" defaultValue={game} className="field min-w-44">
            <option value="">All games</option>
            {games.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Category">
          <select name="category" defaultValue={category ?? ""} className="field min-w-36">
            <option value="">All</option>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CATEGORIES[c].label}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      {listings.length ? (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Game</th>
                <th>Category</th>
                <th>Seller</th>
                <th className="text-right">Price</th>
                <th>Updated</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id}>
                  <td className="max-w-[360px]">
                    <Link href={`/admin/listings/${l.id}`} className="block truncate font-medium text-ink hover:text-phosphor">
                      {l.title}
                    </Link>
                    <p className="text-[0.75rem] text-ink-3">
                      {l.deliveryMethod === "INSTANT" ? "Instant delivery" : "Manual delivery"}
                      {l.featured ? " · Featured" : ""}
                      {l._count.reports ? <span className="text-bad"> · {l._count.reports} report(s)</span> : null}
                    </p>
                  </td>
                  <td className="text-ink-2">{l.game.name}</td>
                  <td className="text-ink-2">{CATEGORIES[l.category].label}</td>
                  <td className="text-ink-2">
                    {l.seller.displayName}
                    {l.seller.status !== "APPROVED" ? <span className="block text-[0.75rem] text-warn">Seller {l.seller.status.toLowerCase()}</span> : null}
                  </td>
                  <td className="text-right whitespace-nowrap tnum">{formatMoney(l.price)}</td>
                  <td className="whitespace-nowrap text-ink-3">{timeAgo(l.updatedAt)}</td>
                  <td>
                    <StatusChip tone={LISTING_STATUS[l.status].tone}>{LISTING_STATUS[l.status].label}</StatusChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <EmptyState title={status === "PENDING" ? "Review queue is empty" : "No listings found"}>
          {status === "PENDING" ? "New and edited listings wait here when listing approval is on in Settings." : "Try another tab or filter."}
        </EmptyState>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} href={(p) => href({ page: p > 1 ? String(p) : undefined })} />
    </>
  );
}

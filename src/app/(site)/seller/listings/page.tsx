import { ExternalLink, Pencil, Zap } from "lucide-react";
import Link from "next/link";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { EmptyState, LinkTabs, PageHeader, Pagination, StatusChip } from "@/components/ui";
import { CATEGORIES, LISTING_STATUS, type ListingCategoryKey } from "@/lib/catalog";
import { listingUrl } from "@/lib/urls";
import { formatMoney, pageParam, str, timeAgo } from "@/lib/utils";
import { deleteListingAction, toggleListingAction } from "@/server/actions/seller";
import { db } from "@/server/db";
import { requireSeller } from "@/server/session";

const PER_PAGE = 20;

const FILTERS = [
  { key: "all", label: "All", statuses: ["DRAFT", "PENDING", "ACTIVE", "PAUSED", "REJECTED", "SOLD_OUT"] },
  { key: "live", label: "Live", statuses: ["ACTIVE"] },
  { key: "review", label: "In review", statuses: ["PENDING"] },
  { key: "paused", label: "Paused", statuses: ["PAUSED"] },
  { key: "sold-out", label: "Sold out", statuses: ["SOLD_OUT"] },
  { key: "rejected", label: "Rejected", statuses: ["REJECTED"] },
] as const;

type ListingStatusKey = (typeof FILTERS)[number]["statuses"][number];

export default async function SellerListingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { profile } = await requireSeller("sell");
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === str(sp.status)) ?? FILTERS[0];
  const page = pageParam(sp.page);
  const saved = str(sp.saved);

  const where = { sellerId: profile.id, status: { in: [...filter.statuses] as ListingStatusKey[] } };
  const [rows, total, grouped] = await Promise.all([
    db.listing.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { game: { select: { slug: true, name: true } } },
    }),
    db.listing.count({ where }),
    db.listing.groupBy({ by: ["status"], where: { sellerId: profile.id, status: { not: "REMOVED" } }, _count: { _all: true } }),
  ]);
  const countOf = (statuses: readonly string[]) => grouped.filter((g) => statuses.includes(g.status)).reduce((n, g) => n + g._count._all, 0);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (p: number) => `/seller/listings?${new URLSearchParams({ ...(filter.key !== "all" ? { status: filter.key } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <>
      <PageHeader
        title="Listings"
        description="Everything you sell. Paused listings are hidden from buyers until you resume them."
        actions={
          <Link href="/seller/listings/new" className="btn btn-coin">
            New listing
          </Link>
        }
      />

      {saved ? (
        <div className="mb-6 rounded-[12px] border border-ok/40 bg-ok/5 px-4 py-3 text-sm text-ink-2" role="status">
          {saved === "review"
            ? "Listing saved. Staff will review it before it goes live; you'll get a notification either way."
            : "Listing published. It's live on the marketplace now."}
        </div>
      ) : null}

      <LinkTabs
        current={filter.key}
        items={FILTERS.map((f) => ({
          key: f.key,
          label: f.label,
          count: countOf(f.statuses),
          href: f.key === "all" ? "/seller/listings" : `/seller/listings?status=${f.key}`,
        }))}
      />

      {rows.length ? (
        <div className="panel-flat overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Status</th>
                <th className="text-right">Price</th>
                <th className="text-right">Stock</th>
                <th className="text-right">Sold</th>
                <th className="text-right">Views</th>
                <th>Updated</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const st = LISTING_STATUS[l.status];
                const cat = CATEGORIES[l.category as ListingCategoryKey];
                return (
                  <tr key={l.id}>
                    <td className="max-w-[24rem] min-w-[16rem]">
                      <Link href={`/seller/listings/${l.id}/edit`} className="block truncate font-medium text-ink hover:text-phosphor">
                        {l.title}
                      </Link>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[0.8125rem] text-ink-3">
                        {l.game.name} · {cat.singular}
                        {l.deliveryMethod === "INSTANT" ? (
                          <span className="inline-flex items-center gap-0.5 text-phosphor">
                            · <Zap className="size-3" aria-hidden /> Instant
                          </span>
                        ) : null}
                      </span>
                      {l.status === "REJECTED" && l.rejectionReason ? (
                        <span className="mt-1 block text-[0.8125rem] text-bad">Staff: {l.rejectionReason}</span>
                      ) : null}
                    </td>
                    <td>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </td>
                    <td className="text-right text-ink tnum">
                      {formatMoney(l.price)}
                      {l.unitLabel ? <span className="block text-[0.6875rem] text-ink-3">per {l.unitLabel}</span> : null}
                    </td>
                    <td className="text-right tnum">{l.stock}</td>
                    <td className="text-right tnum">{l.soldCount}</td>
                    <td className="text-right text-ink-3 tnum">{l.views}</td>
                    <td className="whitespace-nowrap text-ink-3">{timeAgo(l.updatedAt)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        {l.status === "ACTIVE" ? (
                          <Link
                            href={listingUrl({ slug: l.slug, category: l.category, game: l.game })}
                            className="btn btn-ghost btn-sm px-2.5"
                            aria-label={`View ${l.title} on the marketplace`}
                            title="View on marketplace"
                          >
                            <ExternalLink className="size-4" />
                          </Link>
                        ) : null}
                        <Link href={`/seller/listings/${l.id}/edit`} className="btn btn-ghost btn-sm px-2.5" aria-label={`Edit ${l.title}`} title="Edit">
                          <Pencil className="size-4" />
                        </Link>
                        {l.status === "ACTIVE" || l.status === "PAUSED" ? (
                          <ActionForm action={toggleListingAction}>
                            <input type="hidden" name="id" value={l.id} />
                            <SubmitButton className="btn-ghost btn-sm" pendingText="…">
                              {l.status === "ACTIVE" ? "Pause" : "Resume"}
                            </SubmitButton>
                          </ActionForm>
                        ) : null}
                        <ActionForm action={deleteListingAction}>
                          <input type="hidden" name="id" value={l.id} />
                          <ConfirmButton className="btn-danger btn-sm" message={`Delete "${l.title}"? Undelivered stock is removed too. This can't be undone.`}>
                            Delete
                          </ConfirmButton>
                        </ActionForm>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={filter.key === "all" ? "No listings yet" : "Nothing here"}>
          {filter.key === "all"
            ? "Create a listing for an account, currency, item, top-up or gift card. With instant delivery, buyers get it the moment they pay."
            : "No listings match this filter."}
        </EmptyState>
      )}

      <Pagination page={page} pageCount={pageCount} href={href} />
    </>
  );
}

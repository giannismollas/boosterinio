import { Star } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketBrowser, type SearchParams } from "@/components/market-browser";
import { ReviewCard } from "@/components/store/review-card";
import { EmptyState, Pagination, Stars } from "@/components/ui";
import { CATEGORIES, categoryFromSlug } from "@/lib/catalog";
import { sellerUrl } from "@/lib/urls";
import { pageParam, ratingOf, ratingPercent } from "@/lib/utils";
import { db } from "@/server/db";
import { getStore, reviewSelect, type Store } from "../store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; tab: string }>; searchParams: Promise<SearchParams> };

const PER_PAGE = 20;

function tabLabel(tab: string) {
  if (tab === "reviews") return "Reviews";
  const category = categoryFromSlug(tab);
  return category ? CATEGORIES[category].label : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, tab } = await params;
  const store = await getStore(slug);
  const label = tabLabel(tab);
  if (!store || !label) return { title: "Not found", robots: { index: false } };
  return {
    title: `${store.displayName} — ${label}`,
    description: `${label} from ${store.displayName} on Boosterinio. Every order is paid into escrow.`,
    alternates: { canonical: `${sellerUrl(store.slug)}/${tab}` },
  };
}

export default async function StoreTabPage({ params, searchParams }: Props) {
  const { slug, tab } = await params;
  const sp = await searchParams;
  const store = await getStore(slug);
  if (!store) notFound();
  if (tab === "reviews") return <ReviewsTab store={store} page={pageParam(sp.page)} />;

  const category = categoryFromSlug(tab);
  if (!category) notFound();
  const games = await db.game.findMany({
    where: { listings: { some: { sellerId: store.id, status: "ACTIVE", category } } },
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <h2 className="slash-label mb-5 text-[1.375rem]">{CATEGORIES[category].label}</h2>
      <MarketBrowser base={{ sellerId: store.id, category }} basePath={`${sellerUrl(store.slug)}/${tab}`} searchParams={sp} games={games} />
    </>
  );
}

async function ReviewsTab({ store, page }: { store: Store; page: number }) {
  const where = { sellerId: store.id, isHidden: false };
  const [reviews, spread] = await Promise.all([
    db.review.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, select: reviewSelect }),
    db.review.groupBy({ by: ["rating"], where, _count: { _all: true } }),
  ]);
  const avg = ratingOf(store.ratingSum, store.ratingCount);
  const pct = ratingPercent(store.ratingSum, store.ratingCount);
  const byStars = new Map(spread.map((s) => [s.rating, s._count._all]));
  const pageCount = Math.max(1, Math.ceil(store.reviewCount / PER_PAGE));
  const base = `${sellerUrl(store.slug)}/reviews`;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="panel-flat p-5 lg:sticky lg:top-24" aria-label="Rating summary">
        <p className="t-display text-6xl leading-none text-white tnum">{avg ?? "—"}</p>
        <Stars value={avg ?? 0} className="mt-3" />
        <p className="mt-2 text-sm text-ink-2 tnum">
          {pct ? <span className="text-ok">{pct}% rating</span> : "No ratings yet"} · {store.reviewCount} review{store.reviewCount === 1 ? "" : "s"}
        </p>
        <ul className="mt-5 space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => {
            const n = byStars.get(stars) ?? 0;
            const share = store.reviewCount ? (n / store.reviewCount) * 100 : 0;
            return (
              <li key={stars} className="flex items-center gap-2 text-sm">
                <span className="w-3 text-ink-2 tnum">{stars}</span>
                <Star className="size-3.5 fill-p1 text-p1" aria-hidden />
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-cab-4" aria-hidden>
                  <span className="block h-full rounded-full bg-p1" style={{ width: `${share}%` }} />
                </span>
                <span className="w-8 text-right text-ink-3 tnum">{n}</span>
              </li>
            );
          })}
        </ul>
      </aside>
      <div>
        {reviews.length ? (
          <ul className="grid gap-3">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </ul>
        ) : (
          <EmptyState title="No reviews yet">Buyers can review {store.displayName} after a completed order.</EmptyState>
        )}
        <Pagination page={page} pageCount={pageCount} href={(p) => (p > 1 ? `${base}?page=${p}` : base)} />
      </div>
    </div>
  );
}

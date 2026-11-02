import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/site";
import { categoryUrl, listingUrl, serviceUrl } from "@/lib/urls";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed = ["/", "/games", "/accounts", "/currency", "/items", "/top-ups", "/gift-cards", "/sell", "/support", "/faq", "/about", "/blog", "/terms", "/privacy", "/refund-policy"];
  const entries: MetadataRoute.Sitemap = fixed.map((p) => ({ url: absoluteUrl(p), lastModified: now, changeFrequency: "daily", priority: p === "/" ? 1 : 0.6 }));

  try {
    const [games, services, listings, sellers, posts] = await Promise.all([
      db.game.findMany({ where: { isActive: true }, select: { slug: true, categories: true, boostingEnabled: true, updatedAt: true } }),
      db.boostService.findMany({ where: { isActive: true, game: { isActive: true, boostingEnabled: true } }, select: { slug: true, updatedAt: true, game: { select: { slug: true } } } }),
      db.listing.findMany({
        where: { status: "ACTIVE", seller: { status: "APPROVED" } },
        select: { slug: true, category: true, updatedAt: true, game: { select: { slug: true } } },
        orderBy: { updatedAt: "desc" },
        take: 40000,
      }),
      db.sellerProfile.findMany({ where: { status: "APPROVED" }, select: { slug: true, updatedAt: true } }),
      db.post.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    ]);

    for (const g of games) {
      entries.push({ url: absoluteUrl(`/${g.slug}`), lastModified: g.updatedAt, changeFrequency: "daily", priority: 0.8 });
      if (g.boostingEnabled) entries.push({ url: absoluteUrl(`/${g.slug}/boosting`), lastModified: g.updatedAt, changeFrequency: "weekly", priority: 0.8 });
      for (const c of g.categories) entries.push({ url: absoluteUrl(categoryUrl(g.slug, c)), lastModified: now, changeFrequency: "daily", priority: 0.7 });
    }
    for (const s of services) entries.push({ url: absoluteUrl(serviceUrl(s.game.slug, s.slug)), lastModified: s.updatedAt, changeFrequency: "weekly", priority: 0.9 });
    for (const l of listings) {
      if (CATEGORIES[l.category]) entries.push({ url: absoluteUrl(listingUrl(l)), lastModified: l.updatedAt, changeFrequency: "daily", priority: 0.5 });
    }
    for (const s of sellers) entries.push({ url: absoluteUrl(`/sellers/${s.slug}`), lastModified: s.updatedAt, changeFrequency: "weekly", priority: 0.4 });
    for (const p of posts) entries.push({ url: absoluteUrl(`/blog/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "monthly", priority: 0.6 });
  } catch (err) {
    console.error("[sitemap]", err);
  }
  return entries;
}

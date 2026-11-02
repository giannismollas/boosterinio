import Link from "next/link";
import { Container, Crumbs } from "@/components/storefront";
import { EmptyState, Pagination } from "@/components/ui";
import { pageMeta } from "@/lib/seo";
import { formatDate, pageParam } from "@/lib/utils";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "Guides & news",
  description: "League of Legends climbing guides, patch notes for the marketplace, and news from Boosterinio.",
  path: "/blog",
});

export default async function BlogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const page = pageParam((await searchParams).page);
  const where = { published: true };
  const [total, posts] = await Promise.all([
    db.post.count({ where }),
    db.post.findMany({ where, orderBy: { publishedAt: "desc" }, skip: (page - 1) * 12, take: 12 }),
  ]);
  return (
    <Container className="py-10">
      <Crumbs items={[{ name: "Home", href: "/" }, { name: "Guides & news" }]} />
      <h1 className="t-display text-5xl text-ink uppercase sm:text-6xl">Guides &amp; news</h1>
      {posts.length ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="group panel-flat flex flex-col overflow-hidden transition-colors hover:border-cab-5">
              {p.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverUrl} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
              ) : null}
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-lg leading-snug font-semibold text-ink group-hover:text-phosphor">{p.title}</h2>
                {p.excerpt ? <p className="mt-2 line-clamp-3 text-sm text-ink-2">{p.excerpt}</p> : null}
                <p className="mt-auto pt-4 text-[0.8125rem] text-ink-3">{formatDate(p.publishedAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="First issue coming soon" className="mt-8">
          Guides and news will appear here.
        </EmptyState>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / 12)} href={(p) => `/blog?page=${p}`} />
    </Container>
  );
}

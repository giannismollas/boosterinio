import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { Markdown } from "@/components/markdown";
import { Container, Crumbs } from "@/components/storefront";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";
import { formatDate } from "@/lib/utils";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const post = await db.post.findUnique({ where: { slug } });
  return post?.published ? post : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await load((await params).slug);
  if (!post) return {};
  return pageMeta({ title: post.title, description: post.excerpt ?? post.content.slice(0, 155), path: `/blog/${post.slug}` });
}

export default async function PostPage({ params }: Props) {
  const post = await load((await params).slug);
  if (!post) notFound();
  return (
    <Container className="py-10">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Guides & news", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            datePublished: post.publishedAt?.toISOString(),
            dateModified: post.updatedAt.toISOString(),
            author: { "@type": "Organization", name: post.authorName ?? site.name },
            publisher: { "@type": "Organization", name: site.name },
            mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
            ...(post.coverUrl ? { image: post.coverUrl.startsWith("http") ? post.coverUrl : absoluteUrl(post.coverUrl) } : {}),
          },
        ]}
      />
      <Crumbs items={[{ name: "Home", href: "/" }, { name: "Guides & news", href: "/blog" }, { name: post.title }]} />
      <article className="mx-auto max-w-[72ch]">
        <h1 className="t-display text-5xl text-ink uppercase sm:text-6xl">{post.title}</h1>
        <p className="mt-3 text-sm text-ink-3">
          {post.authorName ?? site.name} · {formatDate(post.publishedAt)}
        </p>
        {post.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverUrl} alt="" className="mt-6 aspect-[16/9] w-full rounded-[16px] border border-cab-4 object-cover" />
        ) : null}
        <Markdown source={post.content} className="prose-cab mt-8" />
      </article>
    </Container>
  );
}

import { Markdown } from "@/components/markdown";
import { Container, Crumbs } from "@/components/storefront";
import { REFUNDS } from "@/content/legal";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Refund Policy", description: "When and how Boosterinio refunds orders, including partial refunds and disputes.", path: "/refund-policy" });

export default function Page() {
  return (
    <Container className="py-10">
      <Crumbs items={[{ name: "Home", href: "/" }, { name: "Refund Policy" }]} />
      <h1 className="t-display text-5xl text-ink uppercase sm:text-6xl">Refund Policy</h1>
      <p className="mt-2 text-sm text-ink-3">Last updated: 2 November 2026</p>
      <Markdown source={REFUNDS} className="prose-cab mt-6" />
    </Container>
  );
}

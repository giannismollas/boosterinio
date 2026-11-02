import { Markdown } from "@/components/markdown";
import { Container, Crumbs } from "@/components/storefront";
import { TERMS } from "@/content/legal";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Terms of Service", description: "The rules for buying, selling and boosting on Boosterinio.", path: "/terms" });

export default function Page() {
  return (
    <Container className="py-10">
      <Crumbs items={[{ name: "Home", href: "/" }, { name: "Terms of Service" }]} />
      <h1 className="t-display text-5xl text-ink uppercase sm:text-6xl">Terms of Service</h1>
      <p className="mt-2 text-sm text-ink-3">Last updated: 2 November 2026</p>
      <Markdown source={TERMS} className="prose-cab mt-6" />
    </Container>
  );
}

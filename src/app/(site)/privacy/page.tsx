import { Markdown } from "@/components/markdown";
import { Container, Crumbs } from "@/components/storefront";
import { PRIVACY } from "@/content/legal";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Privacy Policy", description: "What personal data Boosterinio collects, why, and your rights.", path: "/privacy" });

export default function Page() {
  return (
    <Container className="py-10">
      <Crumbs items={[{ name: "Home", href: "/" }, { name: "Privacy Policy" }]} />
      <h1 className="t-display text-5xl text-ink uppercase sm:text-6xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink-3">Last updated: 2 November 2026</p>
      <Markdown source={PRIVACY} className="prose-cab mt-6" />
    </Container>
  );
}

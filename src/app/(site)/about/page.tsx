import Link from "next/link";
import { Container, Crumbs, HouseRules } from "@/components/storefront";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: `About ${site.name}`,
  description: `${site.name} is a gaming marketplace and boosting platform built around approved players, itemized prices and escrow-protected payments.`,
  path: "/about",
});

export default async function AboutPage() {
  const settings = await getSettings();
  return (
    <Container className="py-10">
      <Crumbs items={[{ name: "Home", href: "/" }, { name: "About" }]} />
      <h1 className="t-display text-5xl text-ink uppercase sm:text-6xl">About {site.name}</h1>
      <div className="prose-cab mt-6">
        <p>
          {site.name} is a place to buy boosting and game goods without crossing your fingers. We started with League of Legends boosting and an open
          marketplace for every major game, and we add boosting game by game as we approve enough players.
        </p>
        <p>
          Three ideas run everything here: only approved players can sell or boost, every price is itemized before you pay, and every payment waits in
          escrow until the job is done. When something goes wrong, a person on our staff looks at it.
        </p>
        <p>
          Want to sell or boost? <Link href="/sell">Apply here</Link>. Questions? <Link href="/support">Talk to support</Link>.
        </p>
      </div>
      <section className="mt-14" aria-labelledby="rules-h">
        <HouseRules autoCompleteHours={settings.autoCompleteHours} />
      </section>
    </Container>
  );
}

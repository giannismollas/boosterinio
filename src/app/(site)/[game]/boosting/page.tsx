import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { Container, Crumbs, HouseRules } from "@/components/storefront";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { serviceUrl } from "@/lib/urls";
import { formatMoney } from "@/lib/utils";
import { getGame, getServices } from "@/server/catalog";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ game: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const game = await getGame((await params).game);
  if (!game) return {};
  const short = game.shortName ?? game.name;
  return pageMeta({
    title: `${short} Boosting: Rank, Wins, Placements & Coaching`,
    description: `${game.name} boosting from approved high-elo players. Transparent, itemized prices, solo or duo, escrow-protected payment and live order tracking.`,
    path: `/${game.slug}/boosting`,
  });
}

export default async function BoostingIndex({ params }: Props) {
  const game = await getGame((await params).game);
  if (!game) notFound();
  const [services, settings] = await Promise.all([getServices(game.id), getSettings()]);
  const short = game.shortName ?? game.name;

  return (
    <Container className="py-10">
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: game.name, path: `/${game.slug}` },
          { name: "Boosting", path: `/${game.slug}/boosting` },
        ])}
      />
      <Crumbs items={[{ name: "Home", href: "/" }, { name: game.name, href: `/${game.slug}` }, { name: "Boosting" }]} />
      <h1 className="t-display text-5xl text-ink uppercase sm:text-6xl">{short} boosting</h1>
      <p className="mt-2 max-w-[62ch] text-ink-2">
        {services.length
          ? "Pick a service to configure it. You'll see the full price, line by line, before you pay."
          : `Boosting for ${game.name} opens once enough approved boosters join.`}
      </p>

      {services.length ? (
        <ul className="mt-8 divide-y divide-cab-4 overflow-hidden rounded-[16px] border border-cab-4 bg-cab-2">
          {services.map((s) => (
            <li key={s.id}>
              <Link href={serviceUrl(game.slug, s.slug)} className="group flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-5 transition-colors hover:bg-cab-3 sm:px-7">
                <span className="min-w-0 flex-1">
                  <span className="t-display block text-3xl text-ink uppercase">{s.name}</span>
                  {s.tagline ? <span className="mt-0.5 block text-ink-2">{s.tagline}</span> : null}
                </span>
                {s.fromPrice !== null ? (
                  <span className="text-sm text-ink-3">
                    from <span className="t-display text-2xl text-ink tnum">{formatMoney(s.fromPrice)}</span>
                  </span>
                ) : null}
                <ArrowRight className="size-5 text-ink-3 transition-transform group-hover:translate-x-1 group-hover:text-p1" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8">
          <Link href="/sell?as=booster" className="btn btn-p2">
            Apply to boost {short}
          </Link>
        </div>
      )}

      <section className="mt-16" aria-labelledby="rules-h">
        <HouseRules autoCompleteHours={settings.autoCompleteHours} />
      </section>
    </Container>
  );
}

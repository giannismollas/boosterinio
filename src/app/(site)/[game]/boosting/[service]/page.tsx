import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Configurator } from "@/components/boost/configurator";
import { JsonLd } from "@/components/json-ld";
import { Markdown } from "@/components/markdown";
import { Container, Crumbs, Faq, HouseRules, SectionHead } from "@/components/storefront";
import { defaultSelection } from "@/lib/boosting/engine";
import { breadcrumbLd, faqLd, pageMeta } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";
import { serviceUrl } from "@/lib/urls";
import { cn, str } from "@/lib/utils";
import { getGame, getServices } from "@/server/catalog";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ game: string; service: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function load(params: Props["params"]) {
  const { game: gameSlug, service: serviceSlug } = await params;
  const game = await getGame(gameSlug);
  if (!game || !game.boostingEnabled) return null;
  const services = await getServices(game.id);
  const service = services.find((s) => s.slug === serviceSlug);
  if (!service) return null;
  return { game, services, service };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const { game, service } = data;
  return pageMeta({
    title: service.seoTitle ?? `${game.shortName ?? game.name} ${service.name}`,
    description: service.seoDescription ?? `${service.tagline ?? ""} ${game.name} ${service.name.toLowerCase()} from approved boosters with escrow-protected payment.`.trim(),
    path: serviceUrl(game.slug, service.slug),
  });
}

function parseSelection(raw: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export default async function ServicePage({ params, searchParams }: Props) {
  const data = await load(params);
  if (!data) notFound();
  const { game, services, service } = data;
  const [sp, settings] = await Promise.all([searchParams, getSettings()]);

  const base = (defaultSelection(service.calculator, service.config) ?? {}) as Record<string, unknown>;
  const initial = { ...base, ...parseSelection(str(sp.s)) };
  const path = serviceUrl(game.slug, service.slug);
  const faq = Array.isArray(service.faq) ? (service.faq as { q: string; a: string }[]).filter((f) => f?.q && f?.a) : [];
  const short = game.shortName ?? game.name;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: game.name, path: `/${game.slug}` },
            { name: "Boosting", path: `/${game.slug}/boosting` },
            { name: service.name, path },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: `${game.name} ${service.name}`,
            description: service.seoDescription ?? service.tagline ?? undefined,
            brand: { "@type": "Brand", name: site.name },
            url: absoluteUrl(path),
            ...(service.fromPrice !== null
              ? {
                  offers: {
                    "@type": "AggregateOffer",
                    priceCurrency: site.currency,
                    lowPrice: (service.fromPrice / 100).toFixed(2),
                    availability: "https://schema.org/InStock",
                    url: absoluteUrl(path),
                  },
                }
              : {}),
          },
          ...(faq.length ? [faqLd(faq)] : []),
        ]}
      />

      <Container className="pt-10 pb-6">
        <Crumbs
          items={[
            { name: "Home", href: "/" },
            { name: game.name, href: `/${game.slug}` },
            { name: "Boosting", href: `/${game.slug}/boosting` },
            { name: service.name },
          ]}
        />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="t-display text-5xl text-ink uppercase sm:text-6xl">
              {short} {service.name}
            </h1>
            {service.tagline ? <p className="mt-2 max-w-[60ch] text-ink-2">{service.tagline}</p> : null}
          </div>
        </div>
        <nav aria-label={`${short} boosting services`} className="no-scrollbar -mx-4 mt-6 flex gap-1.5 overflow-x-auto px-4">
          {services.map((s) => (
            <Link
              key={s.id}
              href={serviceUrl(game.slug, s.slug)}
              aria-current={s.id === service.id ? "page" : undefined}
              className={cn(
                "inline-flex h-10 shrink-0 items-center rounded-[10px] px-3.5 text-sm transition-colors",
                s.id === service.id ? "bg-p2 text-white shadow-[0_0_0_1px_rgb(0_0_0/0.6),0_0_16px_-4px_rgb(47_107_255/0.7)]" : "bg-cab-2 text-ink-2 hover:bg-cab-3 hover:text-ink",
              )}
            >
              {s.name}
            </Link>
          ))}
        </nav>
      </Container>

      <Container>
        <Configurator service={{ id: service.id, name: service.name, calculator: service.calculator, config: service.config, path }} initial={initial} />
      </Container>

      <Container className="mt-20 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <Markdown source={service.description} />
        </div>
        <div className="space-y-12">
          <section aria-labelledby="rules-h">
            <HouseRules autoCompleteHours={settings.autoCompleteHours} />
          </section>
          {faq.length ? (
            <section aria-labelledby="faq-h">
              <SectionHead id="faq-h" title="Questions" />
              <Faq items={faq} />
            </section>
          ) : null}
        </div>
      </Container>
    </>
  );
}

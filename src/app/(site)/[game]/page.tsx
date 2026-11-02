import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameTile } from "@/components/game-tile";
import { JsonLd } from "@/components/json-ld";
import { ListingCard, listingCardSelect } from "@/components/listing-card";
import { Slash } from "@/components/marks";
import { Container, Crumbs, SectionHead } from "@/components/storefront";
import { CATEGORIES, CATEGORY_ORDER, categoryLabel, gameHeadingName } from "@/lib/catalog";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { categoryUrl, serviceUrl } from "@/lib/urls";
import { formatMoney } from "@/lib/utils";
import { getGame, getListingCounts, getServices } from "@/server/catalog";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ game: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const game = await getGame((await params).game);
  if (!game) return {};
  const what = [game.boostingEnabled ? "boosting" : null, ...game.categories.map((c) => CATEGORIES[c].label.toLowerCase())].filter(Boolean).slice(0, 4);
  return pageMeta({
    title: game.seoTitle ?? `${game.name} ${game.boostingEnabled ? "Boosting, " : ""}Accounts & Items`,
    description: game.seoDescription ?? `${game.name} ${what.join(", ")} from approved players. ${game.description ?? ""}`.trim().slice(0, 300),
    path: `/${game.slug}`,
  });
}

export default async function GamePage({ params }: Props) {
  const game = await getGame((await params).game);
  if (!game) notFound();

  const [services, counts, latest] = await Promise.all([
    game.boostingEnabled ? getServices(game.id) : Promise.resolve([]),
    getListingCounts(),
    db.listing.findMany({
      where: { gameId: game.id, status: "ACTIVE", seller: { status: "APPROVED" } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: listingCardSelect,
    }),
  ]);

  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Games", path: "/games" }, { name: game.name, path: `/${game.slug}` }])} />
      <Container className="py-10">
        <Crumbs items={[{ name: "Home", href: "/" }, { name: "Games", href: "/games" }, { name: game.name }]} />
        <div className="grid items-center gap-8 md:grid-cols-[220px_minmax(0,1fr)]">
          <GameTile game={game} href={`/${game.slug}`} className="pointer-events-none max-w-[220px]" priority />
          <div>
            <h1 className="t-display text-5xl text-ink uppercase sm:text-6xl">{game.name}</h1>
            {game.description ? <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-2">{game.description}</p> : null}
            <p className="mt-4 text-sm text-ink-3">
              {[game.publisher, game.platforms.join(", ")].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      </Container>

      <section aria-labelledby="boost-h" className="py-8">
        <Container>
          <SectionHead id="boost-h" title={`${gameHeadingName(game)} boosting`} />
          {services.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <Link
                  key={s.id}
                  href={serviceUrl(game.slug, s.slug)}
                  className="cursor-frame group panel-flat flex flex-col overflow-hidden p-5 transition-colors hover:border-cab-5"
                >
                  {s.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.imageUrl} alt="" loading="lazy" className="-mx-5 -mt-5 mb-4 aspect-[16/7] w-[calc(100%+2.5rem)] max-w-none object-cover" />
                  ) : null}
                  <h3 className="t-display text-3xl text-ink uppercase">{s.name}</h3>
                  {s.tagline ? <p className="mt-1.5 text-ink-2">{s.tagline}</p> : null}
                  <p className="mt-auto flex items-end justify-between pt-5">
                    <span className="text-sm text-ink-3">
                      {s.fromPrice !== null ? (
                        <>
                          from <span className="t-display text-2xl text-ink tnum">{formatMoney(s.fromPrice)}</span>
                        </>
                      ) : null}
                    </span>
                    <ArrowRight className="size-5 text-ink-3 transition-transform group-hover:translate-x-1 group-hover:text-p1" />
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="panel-flat p-6 sm:p-8">
              <p className="text-lg font-medium text-ink">Boosting for {game.name} isn&apos;t open yet.</p>
              <p className="mt-1.5 max-w-[60ch] text-ink-2">
                We add boosting game by game once enough approved boosters play it. Are you a high-ranked {game.name} player?{" "}
                <Link href="/sell?as=booster" className="text-phosphor underline-offset-4 hover:underline">
                  Apply to boost
                </Link>
                .
              </p>
            </div>
          )}
        </Container>
      </section>

      <section aria-labelledby="market-h" className="py-8">
        <Container>
          <SectionHead id="market-h" title={`${gameHeadingName(game)} marketplace`} />
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {CATEGORY_ORDER.filter((c) => game.categories.includes(c)).map((c) => (
              <Link
                key={c}
                href={categoryUrl(game.slug, c)}
                className="group panel-flat flex items-center justify-between gap-3 px-4 py-4 transition-colors hover:border-cab-5"
              >
                <span className="flex items-center gap-2.5">
                  <Slash className="h-3.5 w-1.5 text-p1 opacity-50 transition-opacity group-hover:opacity-100" />
                  <span className="font-medium text-ink">
                    {categoryLabel(c, game)}
                  </span>
                </span>
                <span className="t-display text-2xl text-ink-3 tnum">{counts.get(`${game.id}:${c}`) ?? 0}</span>
              </Link>
            ))}
          </div>
          {latest.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {latest.map((l) => (
                <ListingCard key={l.slug} listing={l} />
              ))}
            </div>
          ) : (
            <p className="text-ink-3">No offers for {game.name} yet. Sellers are approved every day.</p>
          )}
        </Container>
      </section>
    </>
  );
}

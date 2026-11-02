import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { HeroConsole } from "@/components/boost/hero-console";
import { GameTile } from "@/components/game-tile";
import { JsonLd } from "@/components/json-ld";
import { ListingCard, listingCardSelect } from "@/components/listing-card";
import { PixelCursor } from "@/components/pixel";
import { Container, Faq, HouseRules, SectionHead } from "@/components/storefront";
import { Avatar, Stars } from "@/components/ui";
import { defaultSelection } from "@/lib/boosting/engine";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/catalog";
import { faqLd, organizationLd, pageMeta, websiteLd } from "@/lib/seo";
import { site } from "@/lib/site";
import { formatMoney, timeAgo } from "@/lib/utils";
import { getGames } from "@/server/catalog";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const games = await getGames();
  return pageMeta({
    title: `${site.name}: LoL Boosting & Gaming Marketplace`,
    description: `League of Legends rank boosting from approved high-elo players, plus accounts, currency, items, top-ups and gift cards for ${games.length} games. Itemized prices and escrow on every order.`,
    path: "/",
    absoluteTitle: true,
  });
}

const FAQ = [
  {
    q: "How does Boosterinio keep my money safe?",
    a: "Your payment goes into escrow. The seller or booster is paid only after you confirm the order, or automatically after the protection window if you don't open a dispute. If something goes wrong, open a dispute from the order page and staff will step in.",
  },
  {
    q: "Who are the boosters and sellers?",
    a: "Players who applied and were approved by our staff. We check their rank history, experience and proof before they can take orders, and we can suspend anyone who breaks the rules.",
  },
  {
    q: "Which payment methods can I use?",
    a: "Cards, Apple Pay and Google Pay, PayPal, and over 100 cryptocurrencies, depending on what's enabled in your region. Checkout always happens on the payment provider's secure page.",
  },
  {
    q: "Is boosting safe for my account?",
    a: "Boosters play only with their own skill: no scripts, no third-party programs, no chatting in game. You can choose Appear offline and Solo-only queue, pause your order at any time, or pick Duo and never share your login.",
  },
  {
    q: "When will boosting be available for other games?",
    a: "League of Legends is first. Valorant, TFT and others are added game by game as we approve enough boosters for each. Their marketplaces are already open.",
  },
  {
    q: "How do I become a seller or booster?",
    a: "Create an account and apply from the Sell page. Tell us what you sell or the rank you play at; staff review applications and reply by email.",
  },
];

export default async function HomePage() {
  const [service, games, settings, counts, latest, reviews] = await Promise.all([
    db.boostService.findFirst({
      where: { slug: "rank-boost", isActive: true, game: { slug: "league-of-legends", isActive: true, boostingEnabled: true } },
      include: { game: true },
    }),
    getGames(),
    getSettings(),
    db.listing.groupBy({ by: ["category"], where: { status: "ACTIVE", seller: { status: "APPROVED" } }, _count: { _all: true } }),
    db.listing.findMany({
      where: { status: "ACTIVE", seller: { status: "APPROVED" } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: listingCardSelect,
    }),
    db.review.findMany({
      where: { isHidden: false, comment: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { author: { select: { name: true } }, seller: { select: { displayName: true } } },
    }),
  ]);

  const countBy = new Map(counts.map((c) => [c.category, c._count._all]));
  const featured = [...games.filter((g) => g.isFeatured), ...games.filter((g) => !g.isFeatured)].slice(0, 12);
  const initial = service ? (defaultSelection("RANK", service.config) as Record<string, unknown>) : null;

  return (
    <>
      <JsonLd data={[organizationLd(), websiteLd(), faqLd(FAQ)]} />

      {/* Attract screen: the working configurator is the hero. */}
      <section className="relative pt-4 pb-5 sm:pt-5">
        <Container>
          {service && initial ? (
            <div className="grid lg:grid-cols-[52px_minmax(0,1fr)_52px] xl:grid-cols-[72px_minmax(0,1fr)_72px]">
              <div className="side-art h-5 rounded-t-[16px] lg:h-auto lg:rounded-t-none lg:rounded-l-[22px]" aria-hidden />
              <HeroConsole
              service={{ id: service.id, name: service.name, calculator: "RANK", config: service.config, path: "/league-of-legends/boosting/rank-boost" }}
              initial={initial}
              title="LoL boosting, priced to the coin"
              intro="Pick your rank and your goal, and see every part of the price before you pay. An approved high-elo booster plays; your money waits in escrow until you confirm the climb."
              />
              <div className="side-art h-5 rounded-b-[16px] lg:h-auto lg:rounded-b-none lg:rounded-r-[22px]" aria-hidden />
            </div>
          ) : (
            <div className="crt p-8">
              <h1 className="t-display t-extrude text-6xl text-ink uppercase">{site.name}</h1>
              <p className="mt-3 text-[#b9dcd5]">Boosting and game goods from approved players.</p>
              <Link href="/games" className="btn btn-coin btn-lg mt-6">
                Browse games
              </Link>
            </div>
          )}
        </Container>
      </section>

      {/* Game select */}
      <section aria-labelledby="games-h" className="pt-3 pb-12">
        <Container>
          <SectionHead
            id="games-h"
            title="Choose your game"
            action={
              <Link href="/games" className="btn btn-ghost">
                All {games.length} games <ArrowRight className="size-4" />
              </Link>
            }
          >
            Boosting is live for League of Legends; every game has an open marketplace.
          </SectionHead>
          <div className="crt p-3 sm:p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-6">
              {featured.map((g, i) => (
                <GameTile key={g.id} game={g} priority={i < 6} />
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Marketplace counter */}
      <section aria-labelledby="market-h" className="py-12">
        <Container>
          <SectionHead id="market-h" title="The trading counter">
            Accounts, currency, items, top-ups and gift cards from approved sellers. Instant listings deliver the moment your payment clears.
          </SectionHead>
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {CATEGORY_ORDER.map((key) => (
              <Link
                key={key}
                href={`/${CATEGORIES[key].slug}`}
                className="group panel-flat flex items-center justify-between gap-3 px-4 py-4 transition-colors hover:border-cab-5"
              >
                <span className="flex items-center gap-2.5">
                  <PixelCursor className="h-2.5 w-2.5 text-p1 opacity-40 transition-opacity group-hover:opacity-100" />
                  <span className="font-medium text-ink">{CATEGORIES[key].label}</span>
                </span>
                <span className="t-display text-2xl text-ink-3 tnum">{countBy.get(key) ?? 0}</span>
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
            <div className="panel-flat flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="t-display text-3xl text-ink uppercase">The counter is empty</p>
                <p className="mt-1 text-ink-2">Approved sellers are setting up shop. Want to be one of the first?</p>
              </div>
              <Link href="/sell" className="btn btn-p2">
                Apply to sell
              </Link>
            </div>
          )}
        </Container>
      </section>

      {/* House rules */}
      <section aria-labelledby="rules-h" className="py-12">
        <Container>
          <HouseRules autoCompleteHours={settings.autoCompleteHours} />
        </Container>
      </section>

      {/* How a boost plays out: a real sequence, so the stages are numbered. */}
      <section aria-labelledby="stages-h" className="py-12">
        <Container>
          <SectionHead id="stages-h" title="How a boost plays out" />
          <ol className="grid gap-px overflow-hidden rounded-[16px] border border-cab-4 bg-cab-4 md:grid-cols-4">
            {[
              { t: "Configure and pay", b: "Choose your rank, goal and extras. Pay by card, PayPal or crypto; the money goes into escrow." },
              { t: "A booster claims it", b: "Your order lands on the booster board, where an approved player for your rank takes it." },
              { t: "Watch the climb", b: "Follow wins, losses and LP from your dashboard, chat with your booster, pause whenever you want to play." },
              { t: "Confirm and rate", b: "Reached your goal? Confirm the order to release payment, then leave a review." },
            ].map((s, i) => (
              <li key={s.t} className="bg-cab-2 p-6">
                <p className="t-display text-4xl text-p1 uppercase">Stage {i + 1}</p>
                <h3 className="mt-3 text-lg font-semibold text-ink">{s.t}</h3>
                <p className="mt-1.5 leading-relaxed text-ink-2">{s.b}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {reviews.length ? (
        <section aria-labelledby="reviews-h" className="py-12">
          <Container>
            <SectionHead id="reviews-h" title="Recent reviews">
              Written by buyers after a completed order.
            </SectionHead>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => (
                <figure key={r.id} className="panel-flat p-5">
                  <Stars value={r.rating} />
                  <blockquote className="mt-3 leading-relaxed text-ink">{r.comment}</blockquote>
                  <figcaption className="mt-4 flex items-center gap-2.5 text-[0.8125rem] text-ink-3">
                    <Avatar name={r.author.name} size={24} />
                    {r.author.name.split(" ")[0]} on {r.seller.displayName} · {timeAgo(r.createdAt)}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {/* Work with us */}
      <section aria-labelledby="work-h" className="py-12">
        <Container>
          <div className="panel grid items-center gap-8 overflow-hidden p-6 sm:p-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <h2 id="work-h" className="t-display text-[2.4rem] text-ink uppercase sm:text-5xl">
                Sell or boost on {site.name}
              </h2>
              <p className="mt-3 max-w-[56ch] leading-relaxed text-ink-2">
                Approved sellers keep {100 - settings.marketplaceFeePct}% of every sale. Boosters earn {settings.boosterPayoutPct}% of each boost they finish. Earnings
                clear from escrow when the buyer confirms, and you can withdraw by PayPal, bank transfer or crypto.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/sell" className="btn btn-p1">
                  Apply to sell
                </Link>
                <Link href="/sell?as=booster" className="btn btn-p2">
                  Apply to boost
                </Link>
              </div>
            </div>
            {/* The cabinet's pricing card, read like a score table. */}
            <dl className="crt px-5 py-4 sm:px-6">
              {[
                { k: "Seller keeps", v: `${100 - settings.marketplaceFeePct}%` },
                { k: "Booster earns", v: `${settings.boosterPayoutPct}%` },
                { k: "Escrow window", v: `${settings.autoCompleteHours} h` },
                { k: "Minimum payout", v: formatMoney(settings.minPayoutCents).replace(/[.,]00$/, "") },
                { k: "Payout methods", v: "PayPal · Bank · Crypto" },
              ].map((x) => (
                <div key={x.k} className="flex items-baseline gap-3 border-b border-phosphor/10 py-2.5 last:border-b-0">
                  <dt className="shrink-0 font-pixel text-[0.75rem] text-[#9fcfc6] uppercase">{x.k}</dt>
                  <span className="min-w-4 flex-1 translate-y-[-3px] border-b-2 border-dotted border-phosphor/25" aria-hidden />
                  <dd className="t-display t-phosphor text-right text-[1.6rem] leading-none tnum">{x.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      <section aria-labelledby="faq-h" className="py-12">
        <Container className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          <SectionHead id="faq-h" title="Questions" className="lg:sticky lg:top-28">
            Something else? <Link href="/support" className="text-phosphor underline-offset-4 hover:underline">Ask support</Link>.
          </SectionHead>
          <Faq items={FAQ} />
        </Container>
      </section>
    </>
  );
}

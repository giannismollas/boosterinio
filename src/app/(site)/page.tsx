import { ArrowRight, Headset, ReceiptText, ShieldCheck, Swords, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { RankBoard } from "@/components/boost/rank-board";
import { GameTile } from "@/components/game-tile";
import { JsonLd } from "@/components/json-ld";
import { ListingCard, listingCardSelect } from "@/components/listing-card";
import { Slash } from "@/components/marks";
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

// Truthful labels only: support is staffed during set hours, so no "24/7".
const TRUST = [
  { icon: ShieldCheck, label: "Secure Escrow" },
  { icon: Zap, label: "Verified Boosters" },
  { icon: ReceiptText, label: "Transparent Pricing" },
  { icon: Headset, label: "Human Support" },
];

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

      {/* Hero: the rank board is the first thing to touch. */}
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <span className="streak top-[6%] left-[58%] w-[46%] -rotate-[28deg]" />
          <span className="streak top-[30%] left-[66%] w-[40%] -rotate-[28deg] opacity-60" />
          <span className="streak top-[2%] left-[30%] w-[30%] -rotate-[28deg] opacity-40" />
          <Image
            src="/images/brand/b-plate-v2.webp"
            alt=""
            width={1100}
            height={1000}
            priority
            sizes="360px"
            className="absolute top-0 right-[max(0.5rem,calc((100vw-1320px)/2+0.5rem))] h-[clamp(250px,24vw,340px)] w-auto max-lg:hidden"
          />
        </div>
        <Container className="pt-6 pb-6 sm:pt-8">
          {service && initial ? (
            <>
              <div className="max-w-[1000px]">
                <p className="inline-flex items-center gap-2.5 rounded-[10px] border border-p1/60 bg-[#13122a]/85 py-1.5 pr-3.5 pl-2 shadow-[0_0_20px_-8px_rgb(255_46_136/0.8)]">
                  <span className="grid size-6 place-items-center rounded-full border border-[#f2c45a]/70 bg-[#2a2010] text-[#f2c45a]" aria-hidden>
                    <Swords className="size-3.5" />
                  </span>
                  <span className="t-display text-[0.9375rem] leading-none text-white">LoL Boosting</span>
                </p>
                <h1 className="t-display t-extrude mt-4 text-[clamp(2.1rem,10.4vw,3.4rem)] text-white sm:text-[clamp(2.6rem,6.4vw,4.6rem)]">
                  LoL boosting,
                  <br />
                  priced <span className="whitespace-nowrap text-p1 [text-shadow:0_0_28px_rgb(255_46_136/0.45)]">to the coin</span>
                </h1>
                <p className="mt-4 max-w-[78ch] text-[1.0625rem] leading-relaxed text-ink-2">
                  Pick your rank and your goal, and see every part of the price before you pay. An approved high-elo booster plays; your money waits in escrow until
                  you confirm the climb.
                </p>
              </div>
              <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3.5 md:grid-cols-4 md:gap-0">
                {TRUST.map((t) => (
                  <li key={t.label} className="flex items-center gap-2.5 text-[0.9375rem] font-medium text-white md:justify-center md:first:justify-start md:[&+li]:border-l md:[&+li]:border-white/10">
                    <t.icon className="size-5 shrink-0 text-p1 drop-shadow-[0_0_8px_rgb(255_46_136/0.6)]" aria-hidden />
                    {t.label}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <RankBoard service={{ id: service.id, name: service.name, calculator: "RANK", config: service.config, path: "/league-of-legends/boosting/rank-boost" }} initial={initial} />
              </div>
            </>
          ) : (
            <div className="crt p-8">
              <h1 className="t-display t-extrude text-6xl text-white">{site.name}</h1>
              <p className="mt-3 text-ink-2">Boosting and game goods from approved players.</p>
              <Link href="/games" className="btn btn-coin btn-lg mt-6">
                <span>Browse games</span>
              </Link>
            </div>
          )}
        </Container>
      </section>

      {/* Game select */}
      <section aria-labelledby="games-h" className="pt-10 pb-12">
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
                  <Slash className="h-3.5 w-1.5 text-p1 opacity-50 transition-opacity group-hover:opacity-100" />
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
                <p className="t-display text-[2.6rem] text-p1 tnum">0{i + 1}</p>
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
              <h2 id="work-h" className="t-display text-[clamp(2rem,9vw,2.4rem)] text-ink uppercase sm:text-5xl">
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
              ].map((x) => (
                <div key={x.k} className="flex items-baseline gap-3 border-b border-phosphor/10 py-2.5 last:border-b-0">
                  <dt className="shrink-0 font-pixel text-[0.75rem] text-[#b3adbd] uppercase">{x.k}</dt>
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

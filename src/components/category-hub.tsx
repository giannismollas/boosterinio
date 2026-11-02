import Link from "next/link";
import { CATEGORIES, type ListingCategoryKey } from "@/lib/catalog";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { categoryUrl } from "@/lib/urls";
import { getGames } from "@/server/catalog";
import { JsonLd } from "./json-ld";
import { MarketBrowser, type SearchParams } from "./market-browser";
import { Container, Crumbs } from "./storefront";

const COPY: Record<ListingCategoryKey, { h1: string; title: string; description: string; intro: string }> = {
  ACCOUNT: {
    h1: "Game accounts",
    title: "Buy game accounts: LoL, Valorant, Fortnite & more",
    description: "Ranked-ready, smurf and collector accounts from approved sellers. Full access, escrow-protected payment and instant delivery on many offers.",
    intro: "Ranked-ready smurfs, high-elo mains and collector accounts from approved sellers. Payment stays in escrow until you've logged in and checked the account.",
  },
  CURRENCY: {
    h1: "In-game currency",
    title: "Buy in-game currency: gold, coins and more",
    description: "WoW gold, OSRS gold, FC coins, Robux and more from approved sellers, delivered by trade, mail or face-to-face, with escrow on every order.",
    intro: "Gold, coins and in-game money delivered by approved sellers by trade, mail or face-to-face. You confirm receipt before the seller is paid.",
  },
  ITEM: {
    h1: "Game items",
    title: "Buy game items, skins and gear",
    description: "Skins, gear, pets and rare drops for your favourite games from approved sellers, with escrow-protected payment.",
    intro: "Skins, gear, pets and rare drops from approved sellers.",
  },
  TOPUP: {
    h1: "Top-ups",
    title: "Game top-ups: RP, VP, V-Bucks and more",
    description: "Premium currency top-ups such as RP, Valorant Points and V-Bucks, delivered to your account by approved sellers.",
    intro: "Premium currency added straight to your account, such as RP, Valorant Points and V-Bucks.",
  },
  GIFT_CARD: {
    h1: "Gift cards",
    title: "Game gift cards and digital codes",
    description: "Digital gift cards and codes for game stores and wallets from approved sellers, many with instant delivery.",
    intro: "Digital codes for game stores and wallets, many delivered instantly.",
  },
};

export function categoryHubMeta(category: ListingCategoryKey) {
  const c = COPY[category];
  return pageMeta({ title: c.title, description: c.description, path: `/${CATEGORIES[category].slug}` });
}

export async function CategoryHub({ category, searchParams }: { category: ListingCategoryKey; searchParams: SearchParams }) {
  const games = (await getGames()).filter((g) => g.categories.includes(category));
  const c = COPY[category];
  const path = `/${CATEGORIES[category].slug}`;
  return (
    <Container className="py-10">
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: CATEGORIES[category].label, path }])} />
      <Crumbs items={[{ name: "Home", href: "/" }, { name: CATEGORIES[category].label }]} />
      <h1 className="t-display text-5xl text-ink uppercase sm:text-6xl">{c.h1}</h1>
      <p className="mt-2 max-w-[62ch] text-ink-2">{c.intro}</p>
      <nav aria-label={`${CATEGORIES[category].label} by game`} className="no-scrollbar -mx-4 mt-6 mb-8 flex gap-2 overflow-x-auto px-4">
        {games.map((g) => (
          <Link key={g.id} href={categoryUrl(g.slug, category)} className="btn btn-ghost btn-sm shrink-0 font-sans text-[0.8125rem] normal-case tracking-normal">
            <span className="size-2.5 shrink-0" style={{ background: g.color }} aria-hidden />
            {g.name}
          </Link>
        ))}
      </nav>
      <MarketBrowser
        base={{ category }}
        basePath={path}
        searchParams={searchParams}
        games={games.map((g) => ({ slug: g.slug, name: g.name }))}
        emptyAction={
          <Link href="/sell" className="btn btn-p2">
            Become a seller
          </Link>
        }
      />
    </Container>
  );
}

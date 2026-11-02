import Link from "next/link";
import { site } from "@/lib/site";
import { LogoMark } from "./brand";

const COLUMNS = [
  {
    title: "LoL Boosting",
    links: [
      { href: "/league-of-legends/boosting/rank-boost", label: "Rank Boost" },
      { href: "/league-of-legends/boosting/win-boost", label: "Win Boost" },
      { href: "/league-of-legends/boosting/placements-boost", label: "Placements Boost" },
      { href: "/league-of-legends/boosting/arena-boost", label: "Arena Boost" },
      { href: "/league-of-legends/boosting/champion-mastery", label: "Champion Mastery" },
      { href: "/league-of-legends/boosting/coaching", label: "Coaching" },
    ],
  },
  {
    title: "Marketplace",
    links: [
      { href: "/accounts", label: "Accounts" },
      { href: "/currency", label: "Currency" },
      { href: "/items", label: "Items" },
      { href: "/top-ups", label: "Top-Ups" },
      { href: "/gift-cards", label: "Gift Cards" },
      { href: "/games", label: "All games" },
    ],
  },
  {
    title: "Work with us",
    links: [
      { href: "/sell", label: "Become a seller" },
      { href: "/sell?as=booster", label: "Become a booster" },
      { href: "/blog", label: "Guides & news" },
      { href: "/about", label: "About Boosterinio" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/support", label: "Support" },
      { href: "/faq", label: "FAQ" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/refund-policy", label: "Refund Policy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-cab-4 bg-[#08080f]">
      <div className="side-art absolute inset-x-0 top-0 h-px" aria-hidden />
      <LogoMark flat className="pointer-events-none absolute -right-10 -bottom-16 h-80 text-p1 opacity-[0.045]" />
      <div className="relative mx-auto max-w-[1320px] px-4 pt-14 pb-10 sm:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div className="col-span-2 max-w-xs md:col-span-1">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-8" />
              <span className="wordmark text-[1.6rem]">{site.name}</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-3">
              Boosting and game goods from approved sellers and boosters. Every payment is held in escrow until your order is done.
            </p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {["Card", "PayPal", "Crypto"].map((m) => (
                <span key={m} className="chip chip-plain">
                  {m}
                </span>
              ))}
            </div>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="font-pixel text-[0.6875rem] text-ink-3 uppercase">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-ink-2 hover:text-ink">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 border-t border-cab-4 pt-6 text-xs leading-relaxed text-ink-3">
          <p>
            © {new Date().getFullYear()} {site.legalName}. {site.name} is not affiliated with, endorsed, sponsored or approved by Riot Games or
            any other game publisher. Game names and marks belong to their respective owners and are used only to describe the services offered.
          </p>
        </div>
      </div>
    </footer>
  );
}

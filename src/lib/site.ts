// Brand + public configuration. Change the name here to rebrand the whole site.
export const site = {
  name: "Boosterinio",
  shortName: "Boosterinio",
  tagline: "Rank up. Trade safe.",
  description:
    "Boosterinio is a gaming marketplace and boosting platform. Buy League of Legends boosting from approved high-elo players, and trade accounts, currency, items, top-ups and gift cards with escrow-protected payments.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  currency: (process.env.NEXT_PUBLIC_CURRENCY || "EUR").toUpperCase(),
  locale: process.env.NEXT_PUBLIC_LOCALE || "en-IE",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@boosterinio.com",
  discordUrl: process.env.NEXT_PUBLIC_DISCORD_URL || "",
  twitterHandle: process.env.NEXT_PUBLIC_TWITTER_HANDLE || "",
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME || "Boosterinio",
} as const;

export function absoluteUrl(path = "/") {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}

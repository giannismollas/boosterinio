// Labels and URL slugs for enums shared by the storefront, dashboards and admin.

export type ListingCategoryKey = "ACCOUNT" | "CURRENCY" | "ITEM" | "TOPUP" | "GIFT_CARD";

export const CATEGORIES: Record<
  ListingCategoryKey,
  { slug: string; label: string; singular: string; blurb: string }
> = {
  ACCOUNT: { slug: "accounts", label: "Accounts", singular: "Account", blurb: "Ranked-ready, smurf and collector accounts with full access." },
  CURRENCY: { slug: "currency", label: "Currency", singular: "Currency", blurb: "Gold, coins and in-game money delivered by approved sellers." },
  ITEM: { slug: "items", label: "Items", singular: "Item", blurb: "Skins, gear, pets and rare drops." },
  TOPUP: { slug: "top-ups", label: "Top-Ups", singular: "Top-up", blurb: "Premium currency added straight to your account." },
  GIFT_CARD: { slug: "gift-cards", label: "Gift Cards", singular: "Gift card", blurb: "Digital codes for stores and game wallets." },
};

export const CATEGORY_ORDER: ListingCategoryKey[] = ["ACCOUNT", "CURRENCY", "ITEM", "TOPUP", "GIFT_CARD"];

export function categoryFromSlug(slug: string): ListingCategoryKey | null {
  const hit = CATEGORY_ORDER.find((k) => CATEGORIES[k].slug === slug);
  return hit ?? null;
}

type Tone = "ok" | "warn" | "bad" | "info" | "live" | "muted" | "p1" | "p2";

export const ORDER_STATUS: Record<string, { label: string; tone: Tone; help: string }> = {
  PENDING_PAYMENT: { label: "Awaiting payment", tone: "muted", help: "Complete payment to start this order." },
  PAID: { label: "Paid", tone: "info", help: "Payment received. Waiting for the seller or a booster to start." },
  IN_PROGRESS: { label: "In progress", tone: "p2", help: "Your order is being worked on." },
  DELIVERED: { label: "Delivered", tone: "warn", help: "Check your order and confirm it to release payment." },
  COMPLETED: { label: "Completed", tone: "ok", help: "Done. Payment was released to the seller." },
  DISPUTED: { label: "Disputed", tone: "bad", help: "Funds are frozen while staff review the dispute." },
  REFUNDED: { label: "Refunded", tone: "muted", help: "This order was refunded." },
  CANCELLED: { label: "Cancelled", tone: "muted", help: "This order was cancelled." },
};

export const LISTING_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "muted" },
  PENDING: { label: "In review", tone: "warn" },
  ACTIVE: { label: "Live", tone: "ok" },
  PAUSED: { label: "Paused", tone: "muted" },
  REJECTED: { label: "Rejected", tone: "bad" },
  SOLD_OUT: { label: "Sold out", tone: "muted" },
  REMOVED: { label: "Removed", tone: "bad" },
};

export const SELLER_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending review", tone: "warn" },
  APPROVED: { label: "Approved", tone: "ok" },
  REJECTED: { label: "Rejected", tone: "bad" },
  SUSPENDED: { label: "Suspended", tone: "bad" },
};

export const TICKET_STATUS: Record<string, { label: string; tone: Tone }> = {
  OPEN: { label: "Waiting for staff", tone: "warn" },
  ANSWERED: { label: "Answered", tone: "info" },
  CLOSED: { label: "Closed", tone: "muted" },
};

export const TICKET_CATEGORIES: Record<string, string> = {
  ORDER: "Order problem",
  PAYMENT: "Payment & refunds",
  ACCOUNT: "My account",
  SELLER: "Selling on Boosterinio",
  BOOSTING: "Boosting",
  BUG: "Bug report",
  OTHER: "Something else",
};

export const TICKET_PRIORITY: Record<string, { label: string; tone: Tone }> = {
  LOW: { label: "Low", tone: "muted" },
  NORMAL: { label: "Normal", tone: "info" },
  HIGH: { label: "High", tone: "warn" },
  URGENT: { label: "Urgent", tone: "bad" },
};

export const DISPUTE_STATUS: Record<string, { label: string; tone: Tone }> = {
  OPEN: { label: "Open", tone: "bad" },
  RESOLVED_REFUND: { label: "Refunded buyer", tone: "muted" },
  RESOLVED_RELEASE: { label: "Released to seller", tone: "ok" },
  CLOSED: { label: "Closed", tone: "muted" },
};

export const PAYOUT_STATUS: Record<string, { label: string; tone: Tone }> = {
  REQUESTED: { label: "Requested", tone: "warn" },
  PAID: { label: "Paid", tone: "ok" },
  REJECTED: { label: "Rejected", tone: "bad" },
};

export const DISPUTE_REASONS = [
  "Not delivered",
  "Not as described",
  "Account recovered or banned",
  "Booster stopped working",
  "Wrong rank or result",
  "Other",
];

export const REPORT_REASONS = ["Scam or fraud", "Wrong category or game", "Misleading description", "Prohibited item", "Offensive content", "Other"];

export const PAYOUT_METHODS = [
  { id: "PAYPAL", label: "PayPal", placeholder: "PayPal email" },
  { id: "BANK", label: "Bank transfer (IBAN)", placeholder: "Account holder, IBAN, BIC" },
  { id: "CRYPTO", label: "Crypto (USDT TRC20)", placeholder: "Wallet address" },
] as const;

export type { Tone };

/** Tab label for a category on a game page: "Riot Points" instead of "Top-Ups", "Gold" instead of "Currency". */
export function categoryLabel(category: ListingCategoryKey, game: { currencyName?: string | null; topupName?: string | null }) {
  if (category === "CURRENCY" && game.currencyName) return game.currencyName;
  if (category === "TOPUP" && game.topupName) return game.topupName;
  return CATEGORIES[category].label;
}

/** Abbreviations players actually use; anything else reads better spelled out. */
const KNOWN_SHORT = new Set(["LoL", "TFT", "CS2", "WoW", "OW2", "GTA", "PoE", "PoE2", "OSRS", "RS3", "FFXIV", "GW2", "DBD", "MLBB", "EFT", "HSR", "ZZZ", "BDO", "R6", "COD"]);

/** Name for headings: "LoL" for League of Legends, "Fortnite" rather than "FN". */
export function gameHeadingName(game: { name: string; shortName: string | null }) {
  return game.shortName && KNOWN_SHORT.has(game.shortName) ? game.shortName : game.name;
}

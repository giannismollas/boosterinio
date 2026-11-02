// Shared by the seller forms (client) and src/server/actions/seller.ts (server).

export const DELIVERY_PRESETS = [
  { minutes: 5, label: "5 minutes" },
  { minutes: 15, label: "15 minutes" },
  { minutes: 30, label: "30 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 180, label: "3 hours" },
  { minutes: 720, label: "12 hours" },
  { minutes: 1440, label: "24 hours" },
] as const;

export const APPLICATION_TYPES = [
  { id: "SELLER", label: "Sell game goods", description: "List accounts, currency, items, top-ups and gift cards." },
  { id: "BOOSTER", label: "Boost orders", description: "Claim paid League of Legends boosting orders from the booster board." },
  { id: "BOTH", label: "Both", description: "Sell on the marketplace and claim boosting orders." },
] as const;

export type ApplicationTypeId = (typeof APPLICATION_TYPES)[number]["id"];

export const MAX_ATTRIBUTES = 8;

/** Suggested attribute names per category, shown as placeholders. */
export const ATTRIBUTE_HINTS: Record<string, [string, string][]> = {
  ACCOUNT: [
    ["Rank", "Diamond IV"],
    ["Level", "57"],
    ["Skins", "37"],
  ],
  CURRENCY: [
    ["Realm", "Silvermoon"],
    ["Faction", "Alliance"],
    ["Delivery", "Face to face"],
  ],
  ITEM: [
    ["Rarity", "Legendary"],
    ["Wear", "Field-Tested"],
    ["Trade lock", "None"],
  ],
  TOPUP: [
    ["Amount", "1,380 RP"],
    ["Region", "EU"],
    ["Method", "Gift"],
  ],
  GIFT_CARD: [
    ["Value", "€25"],
    ["Region", "EU"],
    ["Store", "Battle.net"],
  ],
};

export const WALLET_TX_LABELS: Record<string, { label: string; bucket: "Escrow" | "Available" }> = {
  ESCROW_HOLD: { label: "Held in escrow", bucket: "Escrow" },
  ESCROW_RELEASE: { label: "Released to balance", bucket: "Available" },
  ESCROW_REVERSAL: { label: "Escrow reversed", bucket: "Escrow" },
  PAYOUT: { label: "Payout requested", bucket: "Available" },
  PAYOUT_REVERSAL: { label: "Payout returned", bucket: "Available" },
  ADJUSTMENT: { label: "Adjustment", bucket: "Available" },
};

/** Splits pasted instant-delivery stock into items separated by lines containing only `---`. */
export function splitStockItems(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/^\s*---\s*$/m)
    .map((s) => s.trim())
    .filter(Boolean);
}

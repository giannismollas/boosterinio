import { cache } from "react";
import { db } from "./db";

export type PlatformSettings = {
  /** platform commission on marketplace sales, percent */
  marketplaceFeePct: number;
  /** share of a boosting order paid to the booster, percent */
  boosterPayoutPct: number;
  /** hours after delivery before an order completes on its own */
  autoCompleteHours: number;
  /** new and edited listings wait for staff review */
  requireListingApproval: boolean;
  /** smallest payout a seller can request, cents */
  minPayoutCents: number;
  /** optional site-wide notice shown under the header */
  announcement: string;
  /** shown on the support page */
  supportHours: string;
};

export const DEFAULT_SETTINGS: PlatformSettings = {
  marketplaceFeePct: 10,
  boosterPayoutPct: 70,
  autoCompleteHours: 72,
  requireListingApproval: true,
  minPayoutCents: 2000,
  announcement: "",
  supportHours: "Every day, 09:00–23:00 CET",
};

export const getSettings = cache(async (): Promise<PlatformSettings> => {
  const rows = await db.setting.findMany();
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in DEFAULT_SETTINGS) merged[row.key] = row.value;
  }
  return merged as PlatformSettings;
});

export async function saveSettings(patch: Partial<PlatformSettings>) {
  const entries = Object.entries(patch).filter(([k]) => k in DEFAULT_SETTINGS);
  await db.$transaction(
    entries.map(([key, value]) =>
      db.setting.upsert({
        where: { key },
        create: { key, value: value as never },
        update: { value: value as never },
      }),
    ),
  );
}

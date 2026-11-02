import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { PageHeader } from "@/components/ui";
import { site } from "@/lib/site";
import { saveSettingsAction } from "@/server/actions/admin/settings";
import { requireAdmin } from "@/server/session";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Settings" description="Fees, payouts, the buyer protection window and site-wide notices." />
      <div className="max-w-4xl">
        <SettingsForm
          action={saveSettingsAction}
          currency={site.currency}
          values={{
            marketplaceFeePct: s.marketplaceFeePct,
            boosterPayoutPct: s.boosterPayoutPct,
            autoCompleteHours: s.autoCompleteHours,
            requireListingApproval: s.requireListingApproval,
            minPayout: (s.minPayoutCents / 100).toFixed(2),
            announcement: s.announcement,
            supportHours: s.supportHours,
          }}
        />
      </div>
    </>
  );
}

"use client";

import { ActionForm, FieldError, SubmitButton } from "@/components/forms";
import type { ActionState } from "@/lib/action";

type Values = {
  marketplaceFeePct: number;
  boosterPayoutPct: number;
  autoCompleteHours: number;
  requireListingApproval: boolean;
  minPayout: string;
  announcement: string;
  supportHours: string;
};

export function SettingsForm({ action, values, currency }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; values: Values; currency: string }) {
  return (
    <ActionForm action={action} className="space-y-6">
      {(state) => (
        <>
          <section className="panel-flat grid gap-5 p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <h2 className="text-[0.9375rem] font-semibold text-ink">Money</h2>
              <p className="mt-1 text-[0.8125rem] text-ink-3">Changes apply to orders paid from now on. Orders already paid keep their split.</p>
            </div>
            <div>
              <label htmlFor="st-fee" className="label">
                Marketplace fee (%)
              </label>
              <input id="st-fee" name="marketplaceFeePct" type="number" step="0.5" min={0} max={50} defaultValue={values.marketplaceFeePct} className="field" />
              <FieldError state={state} name="marketplaceFeePct" />
              <p className="mt-1.5 text-[0.8125rem] text-ink-3">Taken from each marketplace sale before the seller is paid.</p>
            </div>
            <div>
              <label htmlFor="st-booster" className="label">
                Booster payout (%)
              </label>
              <input id="st-booster" name="boosterPayoutPct" type="number" step="0.5" min={10} max={100} defaultValue={values.boosterPayoutPct} className="field" />
              <FieldError state={state} name="boosterPayoutPct" />
              <p className="mt-1.5 text-[0.8125rem] text-ink-3">Share of a boost&apos;s price paid to the booster who completes it.</p>
            </div>
            <div>
              <label htmlFor="st-min" className="label">
                Minimum payout ({currency})
              </label>
              <input id="st-min" name="minPayout" inputMode="decimal" defaultValue={values.minPayout} className="field" />
              <FieldError state={state} name="minPayout" />
            </div>
            <div>
              <label htmlFor="st-hours" className="label">
                Auto-complete after delivery (hours)
              </label>
              <input id="st-hours" name="autoCompleteHours" type="number" min={1} max={720} defaultValue={values.autoCompleteHours} className="field" />
              <FieldError state={state} name="autoCompleteHours" />
              <p className="mt-1.5 text-[0.8125rem] text-ink-3">The buyer&apos;s protection window. After it, the order completes and pays out.</p>
            </div>
          </section>

          <section className="panel-flat space-y-5 p-5">
            <h2 className="text-[0.9375rem] font-semibold text-ink">Marketplace</h2>
            <label className="flex items-start gap-3 text-sm text-ink">
              <input type="checkbox" name="requireListingApproval" defaultChecked={values.requireListingApproval} className="mt-0.5 size-4 accent-[#5cf2d6]" />
              <span>
                Review new and edited listings before they go live
                <span className="block text-[0.8125rem] text-ink-3">Recommended while the marketplace is young. Turn off to let approved sellers publish instantly.</span>
              </span>
            </label>
          </section>

          <section className="panel-flat grid gap-5 p-5">
            <h2 className="text-[0.9375rem] font-semibold text-ink">Site</h2>
            <div>
              <label htmlFor="st-ann" className="label">
                Announcement bar
              </label>
              <input id="st-ann" name="announcement" maxLength={300} defaultValue={values.announcement} className="field" placeholder="Shown under the header on every page. Leave empty to hide it." />
              <FieldError state={state} name="announcement" />
            </div>
            <div>
              <label htmlFor="st-support" className="label">
                Support hours
              </label>
              <input id="st-support" name="supportHours" maxLength={100} defaultValue={values.supportHours} className="field" />
            </div>
          </section>

          <div className="flex justify-end">
            <SubmitButton className="btn-coin btn-lg" pendingText="Saving…">
              Save settings
            </SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

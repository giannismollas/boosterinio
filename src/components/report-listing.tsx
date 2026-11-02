"use client";

import { Flag } from "lucide-react";
import { REPORT_REASONS } from "@/lib/catalog";
import { reportListingAction } from "@/server/actions/reports";
import { ActionForm, SubmitButton } from "./forms";

export function ReportListing({ listingId, signedIn }: { listingId: string; signedIn: boolean }) {
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-[0.8125rem] text-ink-3 hover:text-ink [&::-webkit-details-marker]:hidden">
        <Flag className="size-3.5" />
        Report this listing
      </summary>
      {signedIn ? (
        <ActionForm action={reportListingAction} resetOnSuccess className="panel-flat mt-3 space-y-3 p-4">
          <input type="hidden" name="listingId" value={listingId} />
          <div>
            <label className="label" htmlFor="rep-reason">
              Reason
            </label>
            <select id="rep-reason" name="reason" className="field" required defaultValue="">
              <option value="" disabled>
                Choose a reason
              </option>
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="rep-details">
              Details (optional)
            </label>
            <textarea id="rep-details" name="details" className="field min-h-20" maxLength={1000} />
          </div>
          <SubmitButton className="btn-ghost btn-sm">Send report</SubmitButton>
        </ActionForm>
      ) : (
        <p className="mt-2 text-[0.8125rem] text-ink-3">Sign in to report a listing.</p>
      )}
    </details>
  );
}

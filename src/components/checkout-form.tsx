"use client";

import Link from "next/link";
import { useState } from "react";
import { cn, formatMoney } from "@/lib/utils";
import { payOrderAction } from "@/server/actions/checkout";
import { ActionForm, SubmitButton } from "./forms";

export type ProviderOption = { id: string; label: string; description: string };

export function CheckoutForm({ number, total, providers }: { number: string; total: number; providers: ProviderOption[] }) {
  const [provider, setProvider] = useState(providers[0]?.id ?? "");
  return (
    <ActionForm action={payOrderAction} className="space-y-5">
      <input type="hidden" name="number" value={number} />
      <fieldset>
        <legend className="t-display mb-3 text-[1.75rem] text-ink uppercase">Payment method</legend>
        <div className="grid gap-2.5">
          {providers.map((p) => (
            <label
              key={p.id}
              className={cn(
                "flex cursor-pointer items-center gap-3.5 rounded-[12px] border p-4 transition-colors",
                provider === p.id ? "border-phosphor-dim/70 bg-[rgb(255_46_136/0.06)]" : "border-cab-4 hover:bg-cab-3",
              )}
            >
              <input
                type="radio"
                name="provider"
                value={p.id}
                checked={provider === p.id}
                onChange={() => setProvider(p.id)}
                className="size-4 accent-[#ff2e88]"
              />
              <span>
                <span className="block font-medium text-ink">{p.label}</span>
                <span className="block text-[0.8125rem] text-ink-3">{p.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-start gap-3 text-sm text-ink-2">
        <input type="checkbox" name="terms" className="mt-0.5 size-4 shrink-0 accent-[#ff2e88]" required />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="text-phosphor underline-offset-4 hover:underline" target="_blank">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/refund-policy" className="text-phosphor underline-offset-4 hover:underline" target="_blank">
            Refund Policy
          </Link>
          .
        </span>
      </label>
      <SubmitButton className="btn-coin btn-lg w-full" pendingText="Opening secure checkout…">
        Insert coin · Pay {formatMoney(total)}
      </SubmitButton>
    </ActionForm>
  );
}

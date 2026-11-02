"use client";

import { Minus, Plus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { formatMoney } from "@/lib/utils";
import { startMarketCheckout } from "@/server/actions/checkout";
import { PixelShield } from "./pixel";

export function BuyBox({
  listingId,
  price,
  unitLabel,
  minQuantity,
  stock,
  returnTo,
  disabledReason,
}: {
  listingId: string;
  price: number;
  unitLabel: string | null;
  minQuantity: number;
  stock: number;
  returnTo: string;
  disabledReason?: string | null;
}) {
  const [qty, setQty] = useState(Math.max(1, minQuantity));
  const [state, formAction] = useActionState(startMarketCheckout, null);
  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  const max = Math.max(minQuantity, stock);
  const multi = max > 1;
  const set = (n: number) => setQty(Math.min(max, Math.max(minQuantity, Number.isFinite(n) ? Math.floor(n) : minQuantity)));

  return (
    <form action={formAction} className="crt p-5 sm:p-6">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <p className="font-pixel text-[0.6875rem] text-phosphor-dim uppercase">{unitLabel ? `Price per ${unitLabel}` : "Price"}</p>
      <p className="t-display t-phosphor mt-1 text-[3.2rem] leading-none tnum">{formatMoney(price)}</p>

      {multi ? (
        <div className="mt-5">
          <label htmlFor="qty" className="label text-[#9fcfc6]">
            Quantity {unitLabel ? `(${unitLabel})` : ""}
          </label>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost size-11 px-0" onClick={() => set(qty - 1)} disabled={qty <= minQuantity} aria-label="Decrease quantity">
              <Minus className="size-4" />
            </button>
            <input
              id="qty"
              name="quantity"
              type="number"
              inputMode="numeric"
              min={minQuantity}
              max={max}
              value={qty}
              onChange={(e) => set(Number(e.target.value))}
              className="field w-24 text-center tnum"
            />
            <button type="button" className="btn btn-ghost size-11 px-0" onClick={() => set(qty + 1)} disabled={qty >= max} aria-label="Increase quantity">
              <Plus className="size-4" />
            </button>
          </div>
          <p className="mt-2 text-[0.8125rem] text-[#9fcfc6] tnum">
            {stock} in stock{minQuantity > 1 ? ` · minimum ${minQuantity}` : ""}
          </p>
        </div>
      ) : (
        <input type="hidden" name="quantity" value="1" />
      )}

      <div className="mt-5 flex items-baseline justify-between border-t border-phosphor/10 pt-4">
        <span className="font-pixel text-[0.6875rem] text-phosphor-dim uppercase">Total</span>
        <span className="t-display text-3xl text-[#d8fff7] tnum">{formatMoney(price * qty)}</span>
      </div>

      {disabledReason ? (
        <p className="mt-4 rounded-[10px] border border-warn/30 bg-warn/5 px-3 py-2.5 text-sm text-warn">{disabledReason}</p>
      ) : (
        <Submit />
      )}

      <p className="mt-4 flex items-start gap-2.5 text-[0.8125rem] leading-snug text-[#9fcfc6]">
        <PixelShield className="mt-0.5 h-4 w-4 shrink-0" />
        Paid into escrow. The seller is paid only after you confirm you received it.
      </p>
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-coin btn-lg mt-5 w-full">
      {pending ? "Loading…" : "Insert coin · Buy now"}
    </button>
  );
}

import type { QuoteLine } from "@/lib/boosting/engine";
import { formatMoney } from "@/lib/utils";

/** CRT receipt: itemized lines, discount and total for an order. */
export function OrderReceipt({
  title,
  lines,
  facts,
  subtotal,
  discount,
  total,
  quantity,
  unitPrice,
}: {
  title: string;
  lines?: QuoteLine[];
  facts?: { label: string; value: string }[];
  subtotal: number;
  discount: number;
  total: number;
  quantity?: number;
  unitPrice?: number;
}) {
  return (
    <div className="crt p-5 sm:p-6">
      <p className="text-[0.9375rem] leading-snug font-medium text-[#ffffff]">{title}</p>
      {facts?.length ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="text-[0.6875rem] text-phosphor-dim">{f.label}</dt>
              <dd className="truncate text-sm text-[#ffffff]" title={f.value}>
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <ul className="mt-4 space-y-1 border-t border-phosphor/10 pt-4 text-[0.8125rem]">
        {lines?.length ? (
          lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-3">
              <span className="text-[#c8c3d0]">{l.label}</span>
              <span className="tnum text-[#ffffff]">{l.amount === null ? "Free" : `${l.amount < 0 ? "−" : ""}${formatMoney(Math.abs(l.amount))}`}</span>
            </li>
          ))
        ) : quantity && unitPrice ? (
          <li className="flex justify-between gap-3">
            <span className="text-[#c8c3d0]">
              {quantity} × {formatMoney(unitPrice)}
            </span>
            <span className="tnum text-[#ffffff]">{formatMoney(subtotal)}</span>
          </li>
        ) : null}
        {discount > 0 ? (
          <li className="flex justify-between gap-3">
            <span className="text-phosphor">Discount code</span>
            <span className="tnum text-phosphor">−{formatMoney(discount)}</span>
          </li>
        ) : null}
      </ul>
      <div className="mt-4 flex items-end justify-between border-t border-phosphor/10 pt-4">
        <span className="font-pixel text-[0.6875rem] text-phosphor-dim uppercase">Total</span>
        <span className="t-display t-phosphor text-[2.9rem] leading-none tnum">{formatMoney(total)}</span>
      </div>
    </div>
  );
}

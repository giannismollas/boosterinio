"use client";

import { Eye, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { revealOrderSecret } from "@/server/actions/admin/orders";

/** Decrypts a stored secret only when an admin asks for it (audited server-side). */
export function RevealSecret({ orderId, field, label }: { orderId: string; field: "accountLogin" | "deliveryNote" | "stock"; label: string }) {
  const [value, setValue] = useState<string | null | undefined>(undefined);
  const [pending, start] = useTransition();

  if (value === undefined) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              setValue(await revealOrderSecret(orderId, field));
            } catch {
              setValue(null);
            }
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
        Reveal {label}
      </button>
    );
  }
  if (!value) return <p className="text-sm text-ink-3">Nothing stored for {label}.</p>;
  return (
    <pre className="overflow-x-auto rounded-[10px] border border-cab-4 bg-cab-3 p-3 text-[0.8125rem] whitespace-pre-wrap text-ink">{value}</pre>
  );
}

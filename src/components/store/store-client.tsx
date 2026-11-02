"use client";

import { Coins, CreditCard, Gift, Package, Share2, Star, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TAB_ICONS = { store: Store, reviews: Star, ACCOUNT: UserRound, CURRENCY: Coins, ITEM: Package, TOPUP: CreditCard, GIFT_CARD: Gift } as const;
export type StoreTab = { href: string; label: string; count?: number; icon: keyof typeof TAB_ICONS };

/** Storefront tabs: Store, Reviews, then one per marketplace category with its live count. */
export function StoreTabs({ tabs }: { tabs: StoreTab[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Store sections" className="no-scrollbar -mx-4 overflow-x-auto border-b border-cab-4 px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {tabs.map((t) => {
          const active = pathname === t.href;
          const Icon = TAB_ICONS[t.icon];
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative inline-flex h-12 items-center gap-2 px-3.5 text-[0.9375rem] font-medium transition-colors", active ? "text-white" : "text-ink-2 hover:text-white")}
              >
                <Icon className={cn("size-4", active ? "text-p1" : "text-ink-3")} aria-hidden />
                {t.label}
                {t.count !== undefined ? (
                  <span className="rounded-[6px] border border-cab-4 bg-cab-3 px-1.5 text-[0.75rem] leading-5 text-ink-2 tnum">{t.count}</span>
                ) : null}
                {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-p1 shadow-[0_0_10px_rgb(255_46_136/0.8)]" aria-hidden /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Native share sheet where there is one, otherwise copy the link. */
export function ShareButton({ title, path }: { title: string; path: string }) {
  async function share() {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // dismissed
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied.");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  }
  return (
    <button type="button" onClick={share} className="btn btn-ghost size-11 shrink-0 px-0" aria-label="Share this store">
      <Share2 className="size-[18px]" />
    </button>
  );
}

/** A bio clamped to two lines with a More / Less toggle when it runs longer. */
export function ExpandableText({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && !open) setLong(el.scrollHeight > el.clientHeight + 2);
  }, [text, open]);
  return (
    <div className={className}>
      <p ref={ref} className={cn("leading-relaxed whitespace-pre-line text-ink-2", !open && "line-clamp-2")}>
        {text}
      </p>
      {long || open ? (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 text-sm font-medium text-phosphor hover:underline" aria-expanded={open}>
          {open ? "Less" : "More"}
        </button>
      ) : null}
    </div>
  );
}

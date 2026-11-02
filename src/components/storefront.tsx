import { BadgeCheck, ChevronDown, Headset, ReceiptText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Section heading for storefront pages: display type, optional link on the right. */
export function SectionHead({
  title,
  children,
  action,
  id,
  className,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-7 flex flex-wrap items-end justify-between gap-4 self-start", className)}>
      <div className="max-w-[62ch]">
        <h2 id={id} className="t-display text-[2.4rem] text-ink uppercase sm:text-5xl">
          {title}
        </h2>
        {children ? <p className="mt-2 text-ink-2">{children}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-[1320px] px-4 sm:px-6", className)}>{children}</div>;
}

/** The house rules: four promises, each with its pink icon. */
export function HouseRules({ autoCompleteHours, id = "rules-h", title = "House rules" }: { autoCompleteHours: number; id?: string; title?: string }) {
  const rules = [
    {
      icon: BadgeCheck,
      title: "Approved players only",
      body: "Every seller and booster applies first. Staff check their history before they can take a single order.",
    },
    {
      icon: ShieldCheck,
      title: "Escrow on every order",
      body: `We hold your payment. It's released when you confirm the order, or ${autoCompleteHours} hours after delivery if you don't open a dispute.`,
    },
    {
      icon: ReceiptText,
      title: "Prices you can read",
      body: "Each option shows what it adds before you pay, and our server recalculates the total so it can't change behind your back.",
    },
    {
      icon: Headset,
      title: "People on support",
      body: "Tickets and order chats are answered by our staff. Open a dispute and the money stays frozen until we've looked at it.",
    },
  ];
  return (
    <div className="panel @container overflow-hidden">
      <h2 id={id} className="t-display border-b border-white/[0.06] px-6 py-5 text-[2rem] text-white sm:px-8 sm:text-[2.4rem]">
        {title}
      </h2>
      {/* Columns follow the card's own width: four across full-width, one in a side column. */}
      <dl className="grid gap-px bg-white/[0.06] @xl:grid-cols-2 @4xl:grid-cols-4">
        {rules.map((r) => (
          <div key={r.title} className="bg-cab-2 px-6 py-6 sm:px-8">
            <dt>
              <span className="grid size-10 place-items-center rounded-[10px] border border-p1/40 bg-p1/10 text-p1 shadow-[0_0_18px_-6px_rgb(255_46_136/0.8)]">
                <r.icon className="size-5" aria-hidden />
              </span>
              <span className="mt-4 block font-pixel text-[0.8125rem] text-white uppercase">{r.title}</span>
            </dt>
            <dd className="mt-2 leading-relaxed text-ink-2">{r.body}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** FAQ accordion (native details/summary). */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-cab-4 border-y border-cab-4">
      {items.map((f) => (
        <details key={f.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-[1.0625rem] font-medium text-ink [&::-webkit-details-marker]:hidden">
            {f.q}
            <ChevronDown className="size-5 shrink-0 text-ink-3 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <p className="max-w-[70ch] pb-6 leading-relaxed text-ink-2">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Breadcrumb trail rendered above page titles. */
export function Crumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 text-[0.8125rem] text-ink-3">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden>/</span> : null}
            {it.href ? (
              <Link href={it.href} className="hover:text-ink">
                {it.name}
              </Link>
            ) : (
              <span className="text-ink-2" aria-current="page">
                {it.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

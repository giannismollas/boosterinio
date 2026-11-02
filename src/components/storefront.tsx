import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PixelArt, PixelCursor } from "./pixel";

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

/** A flat-head screw holding the instruction card to the panel. */
function Screw({ className }: { className?: string }) {
  return (
    <PixelArt
      map={[".ooo.", "ohsso", "okkko", "ossso", ".ooo."]}
      palette={{ o: "#6f6a62", s: "#b9b4ab", h: "#e9e5dd", k: "#4a463f" }}
      className={className}
    />
  );
}

/**
 * The cabinet's instruction card: a printed card under plexiglass, screwed to
 * the panel. Rule names are set in the pixel face; no yellow (that's the coin's).
 */
export function HouseRules({ autoCompleteHours, id = "rules-h", title = "House rules" }: { autoCompleteHours: number; id?: string; title?: string }) {
  const rules = [
    {
      title: "Approved players only",
      body: "Every seller and booster applies first. Staff check their history before they can take a single order.",
    },
    {
      title: "Escrow on every order",
      body: `We hold your payment. It's released when you confirm the order, or ${autoCompleteHours} hours after delivery if you don't open a dispute.`,
    },
    {
      title: "Prices you can read",
      body: "Each option shows what it adds before you pay, and our server recalculates the total so it can't change behind your back.",
    },
    {
      title: "People on support",
      body: "Tickets and order chats are answered by our staff. Open a dispute and the money stays frozen until we've looked at it.",
    },
  ];
  return (
    <div className="relative overflow-hidden rounded-[10px] border-[6px] border-[#050505] bg-[#0c0b0a] text-ink shadow-[0_24px_48px_-24px_rgb(0_0_0/0.9)]">
      {/* printed frame rule */}
      <div className="pointer-events-none absolute inset-2 rounded-[4px] border border-white/15" aria-hidden />
      <div className="flex items-center justify-between gap-4 bg-p1 px-6 py-3 sm:px-9">
        <h2 id={id} className="t-display text-[2.2rem] leading-none text-white uppercase sm:text-[2.6rem]">
          {title}
        </h2>
        <span className="hidden font-pixel text-[0.6875rem] text-white/85 uppercase sm:block">Read before you play</span>
      </div>
      <dl className="grid gap-x-12 gap-y-7 px-6 py-7 sm:px-9 sm:py-9 md:grid-cols-2">
        {rules.map((r) => (
          <div key={r.title}>
            <dt className="flex items-center gap-2.5 font-pixel text-[0.8125rem] text-ink uppercase">
              <PixelCursor className="h-2.5 w-2.5 shrink-0 text-p1" />
              {r.title}
            </dt>
            <dd className="mt-2 leading-relaxed text-ink-2">{r.body}</dd>
          </div>
        ))}
      </dl>
      <Screw className="absolute top-[58px] left-2 h-3 w-3 sm:top-[64px]" />
      <Screw className="absolute top-[58px] right-2 h-3 w-3 sm:top-[64px]" />
      <Screw className="absolute bottom-2 left-2 h-3 w-3" />
      <Screw className="absolute right-2 bottom-2 h-3 w-3" />
      {/* plexiglass glare */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgb(255_255_255/0.07)_0%,transparent_26%,transparent_74%,rgb(255_255_255/0.04)_100%)]" aria-hidden />
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

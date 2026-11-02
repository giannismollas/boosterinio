import Link from "next/link";
import type { ReactNode } from "react";
import type { Tone } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<Tone, string> = {
  ok: "text-ok",
  warn: "text-warn",
  bad: "text-bad",
  info: "text-phosphor",
  live: "text-phosphor",
  muted: "text-ink-3",
  p1: "text-p1",
  p2: "text-[#86a8ff]",
};

export function StatusChip({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("chip", TONE_CLASS[tone], className)}>{children}</span>;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-[0.8125rem] text-bad">{error}</p> : hint ? <p className="mt-1.5 text-[0.8125rem] text-ink-3">{hint}</p> : null}
    </div>
  );
}

/** Page title block used across dashboards and admin. */
export function PageHeader({ title, description, actions, className }: { title: string; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="t-display text-[2.6rem] text-ink uppercase sm:text-5xl">{title}</h1>
        {description ? <p className="mt-2 max-w-[62ch] text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, children, action, className }: { title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("panel-flat flex flex-col items-center px-6 py-14 text-center", className)}>
      <p className="t-display text-3xl text-ink-2 uppercase">{title}</p>
      {children ? <div className="mt-2 max-w-[48ch] text-sm text-ink-3">{children}</div> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Pagination({ page, pageCount, href }: { page: number; pageCount: number; href: (page: number) => string }) {
  if (pageCount <= 1) return null;
  const pages: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(pageCount, page + 2); p++) pages.push(p);
  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 ? (
        <Link className="btn btn-ghost btn-sm" href={href(page - 1)} rel="prev">
          Prev
        </Link>
      ) : null}
      {pages.map((p) => (
        <Link
          key={p}
          href={href(p)}
          aria-current={p === page ? "page" : undefined}
          className={cn("btn btn-sm min-w-9", p === page ? "btn-p2" : "btn-ghost")}
        >
          {p}
        </Link>
      ))}
      {page < pageCount ? (
        <Link className="btn btn-ghost btn-sm" href={href(page + 1)} rel="next">
          Next
        </Link>
      ) : null}
    </nav>
  );
}

/** Pixel stars for ratings (0–5, halves rounded). */
export function Stars({ value, className }: { value: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={cn("inline-flex items-center gap-[3px]", className)} role="img" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 7 7" shapeRendering="crispEdges" className="h-3 w-3" aria-hidden>
          <path
            d="M3 0h1v2h3v1H6v1H5v1h1v2H5V6H2v1H1V5h1V4H1V3H0V2h3z"
            fill={i < full ? "#5cf2d6" : "#403d39"}
          />
        </svg>
      ))}
    </span>
  );
}

export function StatTile({ label, value, sub, href }: { label: string; value: ReactNode; sub?: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-[0.8125rem] text-ink-3">{label}</p>
      <p className="t-display mt-1 text-4xl text-ink tnum">{value}</p>
      {sub ? <p className="mt-1 text-[0.8125rem] text-ink-2">{sub}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className="panel-flat block p-4 transition-colors hover:border-cab-5">
      {body}
    </Link>
  ) : (
    <div className="panel-flat p-4">{body}</div>
  );
}

/** Simple tab bar of links (used by dashboards and filters). */
export function LinkTabs({ items, current }: { items: { href: string; label: string; count?: number; key: string }[]; current: string }) {
  return (
    <div className="no-scrollbar -mx-1 mb-6 flex gap-1 overflow-x-auto px-1">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          aria-current={it.key === current ? "page" : undefined}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-[9px] px-3 text-sm transition-colors",
            it.key === current ? "bg-cab-4 text-ink" : "text-ink-2 hover:bg-cab-3 hover:text-ink",
          )}
        >
          {it.label}
          {it.count !== undefined ? <span className="tnum text-xs text-ink-3">{it.count}</span> : null}
        </Link>
      ))}
    </div>
  );
}

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className={cn("shrink-0 rounded-[10px] object-cover", className)} style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className={cn("t-display inline-flex shrink-0 items-center justify-center rounded-[10px] bg-cab-4 text-ink", className)}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {letters || "?"}
    </span>
  );
}

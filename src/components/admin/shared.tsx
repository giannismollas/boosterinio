import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cn, formatDateTime } from "@/lib/utils";

/** A titled panel on admin detail pages. */
export function Section({
  title,
  actions,
  children,
  className,
  description,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: ReactNode;
}) {
  return (
    <section className={cn("panel-flat p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-1 text-[0.8125rem] text-ink-3">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** Label / value pairs. */
export function KV({ items, className }: { items: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-[minmax(110px,36%)_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm", className)}>
      {items.map(([k, v]) => (
        <Fragment key={k}>
          <dt className="text-ink-3">{k}</dt>
          <dd className="min-w-0 break-words text-ink">{v === null || v === undefined || v === "" ? <span className="text-ink-3">—</span> : v}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

/** GET filter form that sits above a table. */
export function FilterBar({ children, resetHref, className }: { children: ReactNode; resetHref?: string; className?: string }) {
  return (
    <form method="get" className={cn("mb-5 flex flex-wrap items-end gap-3", className)}>
      {children}
      <button type="submit" className="btn btn-ghost btn-sm h-11">
        Apply
      </button>
      {resetHref ? (
        <Link href={resetHref} className="inline-flex h-11 items-center px-1 text-sm text-ink-3 hover:text-ink">
          Reset
        </Link>
      ) : null}
    </form>
  );
}

export function FilterField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

/** Horizontally scrollable table container. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="panel-flat overflow-x-auto">{children}</div>;
}

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: Date;
  author: string | null;
  /** SYSTEM renders as a centred log line */
  kind: "USER" | "SYSTEM" | "STAFF";
  internal?: boolean;
  /** which side the bubble sits on */
  side?: "left" | "right";
};

/** Message thread for order chats and tickets. */
export function Thread({ messages, empty = "No messages yet." }: { messages: ThreadMessage[]; empty?: string }) {
  if (!messages.length) return <p className="py-6 text-center text-sm text-ink-3">{empty}</p>;
  return (
    <ol className="space-y-3">
      {messages.map((m) =>
        m.kind === "SYSTEM" ? (
          <li key={m.id} className="flex items-center gap-3 py-1 text-[0.8125rem] text-ink-3">
            <span className="h-px flex-1 bg-cab-4" aria-hidden />
            <span className="max-w-[70ch] text-center">
              {m.body} <span className="whitespace-nowrap text-ink-3/80">· {formatDateTime(m.createdAt)}</span>
            </span>
            <span className="h-px flex-1 bg-cab-4" aria-hidden />
          </li>
        ) : (
          <li key={m.id} className={cn("flex", m.side === "right" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[78ch] rounded-[12px] border px-4 py-3",
                m.internal
                  ? "border-dashed border-warn/50 bg-warn/[0.06]"
                  : m.kind === "STAFF"
                    ? "border-p2/40 bg-p2/[0.08]"
                    : "border-cab-4 bg-cab-3",
              )}
            >
              <p className="mb-1 flex flex-wrap items-center gap-x-2 text-[0.75rem] text-ink-3">
                <span className="font-medium text-ink-2">{m.author ?? "Deleted user"}</span>
                {m.internal ? <span className="text-warn">Internal note</span> : m.kind === "STAFF" ? <span className="text-[#ff7ab8]">Staff</span> : null}
                <span>{formatDateTime(m.createdAt)}</span>
              </p>
              <p className="text-sm whitespace-pre-line text-ink">{m.body}</p>
            </div>
          </li>
        ),
      )}
    </ol>
  );
}

/** Big pixel numeral for money/counts. */
export function Numeral({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-display leading-none tnum", className)}>{children}</span>;
}

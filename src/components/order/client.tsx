"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Re-renders the server page every `ms` while the tab is visible (chat + status). */
export function AutoRefresh({ ms = 10000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, ms);
    return () => clearInterval(id);
  }, [ms, router]);
  return null;
}

/** Keeps the chat log scrolled to the newest line. */
export function ChatScroller({ children, count }: { children: React.ReactNode; count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);
  return (
    <div ref={ref} className="max-h-[480px] space-y-3 overflow-y-auto p-4 sm:p-5" aria-live="polite">
      {children}
    </div>
  );
}

/** 1–5 rating picker (radio inputs underneath). */
export function RatingInput({ name = "rating" }: { name?: string }) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset>
      <legend className="label">Your rating</legend>
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
            <input type="radio" name={name} value={n} className="sr-only" checked={value === n} onChange={() => setValue(n)} />
            <svg viewBox="0 0 24 24" className={cn("size-8 transition-transform", shown >= n && "scale-110")} aria-hidden>
              <path
                d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.1l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z"
                fill={shown >= n ? "#ff2e88" : "#393753"}
                className={shown >= n ? "drop-shadow-[0_0_8px_rgb(255_46_136/0.6)]" : undefined}
              />
            </svg>
            <span className="sr-only">
              {n} star{n > 1 ? "s" : ""}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Masked secret with a reveal toggle (account logins, codes). */
export function Secret({ value }: { value: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <pre className={cn("rounded-[10px] border border-cab-4 bg-black/40 p-3.5 font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-[#ffffff]", !shown && "select-none blur-[5px]")}>
        {value}
      </pre>
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShown((s) => !s)}>
          {shown ? "Hide" : "Reveal"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            void navigator.clipboard?.writeText(value);
          }}
        >
          Copy
        </button>
      </div>
    </div>
  );
}

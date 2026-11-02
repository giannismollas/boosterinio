"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A horizontal row of cards with a header (title, an action such as "Show all")
 * and previous/next buttons. Scrolls by touch too; the next card peeks at the edge.
 */
export function CardRail({ title, action, label, children }: { title: ReactNode; action?: ReactNode; label: string; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    el?.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const step = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section aria-label={label}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">{title}</div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <button type="button" onClick={() => step(-1)} disabled={edge.start} className="btn btn-ghost size-9 rounded-full px-0" aria-label="Previous">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => step(1)} disabled={edge.end} className="btn btn-ghost size-9 rounded-full px-0" aria-label="Next">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <ul ref={ref} className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6">
        {Children.toArray(children).map((child, i) => (
          <li key={i} className="w-[82%] max-w-[330px] shrink-0 snap-start sm:w-[46%] lg:w-[31%] xl:w-[23.6%]">
            {child}
          </li>
        ))}
      </ul>
    </section>
  );
}

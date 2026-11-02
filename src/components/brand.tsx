import Link from "next/link";
import { useId } from "react";
import { B_PATH, B_TRANSFORM, B_VIEWBOX } from "@/lib/brand-mark";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

/** The Boosterinio mark: the pink italic B. */
export function LogoMark({ className, flat = false }: { className?: string; flat?: boolean }) {
  const id = useId();
  return (
    <svg viewBox={B_VIEWBOX} className={cn("h-8 w-auto", className)} aria-hidden>
      {flat ? null : (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor="#ff74b6" />
            <stop offset="0.5" stopColor="#ff2e88" />
            <stop offset="1" stopColor="#d80d68" />
          </linearGradient>
        </defs>
      )}
      <path d={B_PATH} transform={B_TRANSFORM} fill={flat ? "currentColor" : `url(#${id})`} fillRule="evenodd" />
    </svg>
  );
}

/** Mark + white italic wordmark, linking home. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2", className)} aria-label={`${site.name} home`}>
      <LogoMark className="h-8 drop-shadow-[0_0_14px_rgb(255_46_136/0.35)] transition-transform duration-200 group-hover:-translate-y-0.5 sm:h-9" />
      {!compact && <span className="wordmark hidden text-[1.3rem] min-[350px]:inline sm:text-[1.6rem] lg:text-[1.75rem]">{site.name}</span>}
    </Link>
  );
}

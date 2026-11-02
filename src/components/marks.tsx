import type { SVGProps } from "react";

/** The slanted pink bar that marks the active or hovered item (and the "/" in card labels). */
export function Slash({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 6 14" className={className} aria-hidden {...props}>
      <path d="M3 0h3L3 14H0z" fill="currentColor" />
    </svg>
  );
}

/** The coin slot drawn on the Insert coin plate: a rounded frame with a T-shaped slot. */
export function CoinSlotIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <rect x="1.5" y="1.5" width="17" height="17" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M6 6h8M10 6v8.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** A short stack of coins, beside totals. */
export function CoinStack(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" fill="currentColor" />
      <path d="M4 5.5v4c0 1.66 3.58 3 8 3s8-1.34 8-3v-4c0 1.66-3.58 3-8 3s-8-1.34-8-3Z" fill="currentColor" opacity="0.85" />
      <path d="M4 11v4c0 1.66 3.58 3 8 3s8-1.34 8-3v-4c0 1.66-3.58 3-8 3s-8-1.34-8-3Z" fill="currentColor" opacity="0.7" />
      <path d="M4 16.5v2c0 1.66 3.58 3 8 3s8-1.34 8-3v-2c0 1.66-3.58 3-8 3s-8-1.34-8-3Z" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

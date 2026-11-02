import { cn } from "@/lib/utils";

// A sixteen-point seal, computed once.
const SEAL = Array.from({ length: 32 }, (_, i) => {
  const r = i % 2 === 0 ? 11.4 : 9.8;
  const a = (Math.PI * i) / 16 - Math.PI / 2;
  return `${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`;
}).join(" ");

/** Staff-granted badge: the store's identity and track record were checked. */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4 shrink-0", className)} role="img" aria-label="Verified seller">
      <title>Verified seller: identity and track record checked by Boosterinio staff</title>
      <polygon points={SEAL} fill="#e3126f" stroke="#ff2e88" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M7.6 12.3l2.9 2.9 5.9-6.1" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

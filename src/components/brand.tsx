import Link from "next/link";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

// Chunky pixel "B": upper bowl narrower than the lower one, like an arcade title.
const B = [
  "BBBBBB..",
  "BBBBBBB.",
  "BB...BB.",
  "BB...BB.",
  "BBBBBB..",
  "BBBBBBB.",
  "BB....BB",
  "BB....BB",
  "BBBBBBBB",
  "BBBBBBB.",
];

function bRects(fill: string, dx: number, dy: number) {
  const out: React.ReactNode[] = [];
  B.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== "B") {
        x++;
        continue;
      }
      let len = 1;
      while (x + len < row.length && row[x + len] === "B") len++;
      out.push(<rect key={`${fill}${x}.${y}`} x={x + dx} y={y + dy} width={len} height={1} fill={fill} />);
      x += len;
    }
  });
  return out;
}

/**
 * The Boosterinio mark: a pixel B extruded in P1 magenta and P2 blue.
 * On the lit marquee plate the extrusion prints dark so the B stays legible.
 */
export function LogoMark({ className, onPlate = false }: { className?: string; onPlate?: boolean }) {
  return (
    <svg viewBox="0 0 11 13" shapeRendering="crispEdges" className={cn("h-8 w-auto", className)} aria-hidden>
      {bRects(onPlate ? "#1a0410" : "#2f6bff", 2, 2)}
      {bRects(onPlate ? "#5c0a35" : "#ff2e88", 1, 1)}
      {bRects("#fffaf2", 0, 0)}
    </svg>
  );
}

/** Wordmark + mark. `lit` renders it as the backlit marquee sign (header). */
export function Logo({ className, compact = false, lit = false }: { className?: string; compact?: boolean; lit?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5", lit && "marquee-plate", className)}
      aria-label={`${site.name} home`}
    >
      <LogoMark onPlate={lit} className={cn("transition-transform duration-200 group-hover:-translate-y-0.5", lit ? "h-9" : "h-8")} />
      {!compact && (
        <span
          className={cn(
            "t-display hidden leading-none tracking-[0.04em] uppercase min-[460px]:inline",
            lit ? "marquee-lit text-[2.5rem] text-[#fffaf2]" : "t-extrude text-[1.9rem] text-ink",
          )}
        >
          {site.name}
        </span>
      )}
    </Link>
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";

export type GameTileData = { slug: string; name: string; shortName: string | null; color: string; imageUrl: string | null; boostingEnabled: boolean };

/**
 * A cartridge on the game select screen: the game's color as the label,
 * its short name in pixel type, and the P1 cursor on hover/focus.
 */
export function GameTile({ game, href, className, priority = false }: { game: GameTileData; href?: string; className?: string; priority?: boolean }) {
  const mono = (game.shortName ?? game.name).slice(0, 6);
  return (
    <Link
      href={href ?? `/${game.slug}`}
      className={cn("cursor-frame group block rounded-[14px] [--cursor:var(--color-p1)]", className)}
      aria-label={`${game.name}${game.boostingEnabled ? ", boosting available" : ""}`}
    >
      <div className="overflow-hidden rounded-[14px] border border-cab-4 bg-cab-2 transition-[transform,border-color] duration-200 group-hover:-translate-y-1 group-hover:border-cab-5">
        <div
          className="relative aspect-[4/3] overflow-hidden"
          style={{
            background: `linear-gradient(160deg, ${game.color} 0%, color-mix(in oklab, ${game.color} 45%, #100f0e) 70%)`,
          }}
        >
          {game.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={game.imageUrl}
              alt=""
              loading={priority ? "eager" : "lazy"}
              className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <>
              <div
                className="absolute inset-0 opacity-25 mix-blend-multiply"
                style={{ background: "repeating-linear-gradient(180deg, #000 0 1px, transparent 1px 3px)" }}
                aria-hidden
              />
              <span
                className="t-display absolute inset-0 grid place-items-center text-[2.6rem] text-white uppercase sm:text-5xl"
                style={{ textShadow: "2px 2px 0 rgb(0 0 0 / 0.55), 4px 4px 0 rgb(0 0 0 / 0.3)" }}
                aria-hidden
              >
                {mono}
              </span>
            </>
          )}
          {game.boostingEnabled ? (
            <span className="chip absolute top-2 left-2 border-black/40 bg-black/75 text-phosphor">Boosting</span>
          ) : null}
        </div>
        <p className="line-clamp-2 min-h-[3.25rem] px-3 py-2.5 text-[0.8125rem] leading-snug font-medium text-ink-2 transition-colors group-hover:text-ink sm:min-h-0 sm:text-sm">
          {game.name}
        </p>
      </div>
    </Link>
  );
}

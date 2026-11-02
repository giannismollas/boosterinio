"use client";

import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { GameArt, type ListingCardData } from "./listing-card";

/** Listing photos: a large stage, thumbnails, and a full-screen viewer (arrows, Esc). */
export function ListingGallery({ images, title, game }: { images: string[]; title: string; game: ListingCardData["game"] }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const count = images.length;
  const go = useCallback((d: number) => setIndex((i) => (i + d + count) % count), [count]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, go]);

  if (!count) {
    return (
      <div className="relative aspect-[16/7] overflow-hidden rounded-[16px] border border-cab-4 bg-cab-3">
        <GameArt game={game} big />
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="group relative overflow-hidden rounded-[16px] border border-cab-4 bg-cab-3">
        <button type="button" onClick={() => setOpen(true)} className="block w-full cursor-zoom-in" aria-label="Open photo full screen">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[index]} alt={`${title}, photo ${index + 1} of ${count}`} className="aspect-[16/9] w-full object-cover" />
        </button>
        <span className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-[8px] bg-black/70 px-2 py-1 text-[0.75rem] text-white tnum">
          <Expand className="size-3.5" aria-hidden /> {index + 1} / {count}
        </span>
        {count > 1 ? (
          <>
            <StageArrow side="left" onClick={() => go(-1)} />
            <StageArrow side="right" onClick={() => go(1)} />
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1" aria-label="Photos">
          {images.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                data-active={i === index}
                className={cn("cursor-frame block overflow-hidden rounded-[10px] border", i === index ? "border-transparent" : "border-cab-4 opacity-70 hover:opacity-100")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" className="h-16 w-24 object-cover sm:h-[72px] sm:w-[108px]" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <div role="dialog" aria-modal="true" aria-label={`${title}: photos`} className="fixed inset-0 z-[70] flex flex-col bg-black/92 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-white/80">
            <span className="min-w-0 truncate">{title}</span>
            <span className="flex items-center gap-3">
              <span className="tnum">
                {index + 1} / {count}
              </span>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost size-10 px-0" aria-label="Close" autoFocus>
                <X className="size-5" />
              </button>
            </span>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6" onClick={() => setOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[index]} alt={`${title}, photo ${index + 1} of ${count}`} className="max-h-full max-w-full rounded-[10px] object-contain" onClick={(e) => e.stopPropagation()} />
            {count > 1 ? (
              <>
                <StageArrow side="left" onClick={(e) => (e.stopPropagation(), go(-1))} />
                <StageArrow side="right" onClick={(e) => (e.stopPropagation(), go(1))} />
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StageArrow({ side, onClick }: { side: "left" | "right"; onClick: (e: React.MouseEvent) => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={cn(
        "absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/60 text-white transition-colors hover:border-p1 hover:bg-p2",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}

"use client";

import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Uploads images to /api/upload and keeps their URLs in hidden inputs named
 * `name`, so the surrounding server-action form receives them in order.
 * Drop files on it or pick them; the first image is the cover.
 */
export function ImageUploader({
  name,
  initial = [],
  max = 8,
  folder = "listings",
  aspect = "aspect-[4/3]",
  hint,
}: {
  name: string;
  initial?: string[];
  max?: number;
  folder?: string;
  /** tile shape, e.g. "aspect-[4/1]" for banners */
  aspect?: string;
  hint?: string;
}) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [pending, setPending] = useState(0);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const room = max - urls.length - pending;

  async function upload(files: FileList | File[] | null) {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    const batch = list.slice(0, Math.max(0, room));
    if (list.length > batch.length) toast.error(`Up to ${max} image${max === 1 ? "" : "s"}.`);
    setPending((n) => n + batch.length);
    try {
      for (const file of batch) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", folder);
        try {
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
          if (!res.ok || !json.url) toast.error(json.error ?? "Upload failed.");
          else setUrls((u) => (u.length < max ? [...u, json.url!] : u));
        } finally {
          setPending((n) => n - 1);
        }
      }
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  const single = max === 1;
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        upload(e.dataTransfer.files);
      }}
      className={cn("rounded-[14px] transition-shadow", over && "shadow-[0_0_0_2px_var(--color-p1),0_0_24px_-6px_rgb(255_46_136/0.7)]")}
    >
      <div className={cn("grid gap-2", single ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-4")}>
        {urls.map((url, i) => (
          <div key={url} className={cn("group relative overflow-hidden rounded-[10px] border border-cab-4 bg-cab-3", aspect)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Upload ${i + 1}`} className="size-full object-cover" />
            <input type="hidden" name={name} value={url} />
            <button
              type="button"
              onClick={() => setUrls((u) => u.filter((x) => x !== url))}
              className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-[8px] bg-black/70 text-ink opacity-90 hover:bg-bad"
              aria-label={`Remove image ${i + 1}`}
            >
              <X className="size-4" />
            </button>
            {!single && i === 0 ? <span className="chip chip-plain absolute bottom-1.5 left-1.5 border-p1/50 bg-black/75 text-white">Cover</span> : null}
            {!single && i > 0 ? (
              <button
                type="button"
                onClick={() => setUrls((u) => [url, ...u.filter((x) => x !== url)])}
                className="absolute bottom-1.5 left-1.5 inline-flex h-6 items-center gap-1 rounded-[7px] bg-black/75 px-2 text-[0.6875rem] text-white opacity-90 hover:bg-p2"
              >
                <Star className="size-3" aria-hidden /> Make cover
              </button>
            ) : null}
          </div>
        ))}
        {Array.from({ length: pending }, (_, i) => (
          <div key={`p${i}`} className={cn("grid place-items-center rounded-[10px] border border-cab-4 bg-cab-3 text-ink-3", aspect)}>
            <Loader2 className="size-5 animate-spin" aria-label="Uploading" />
          </div>
        ))}
        {room > 0 ? (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className={cn(
              "grid place-items-center rounded-[10px] border border-dashed border-cab-5 px-3 text-ink-3 transition-colors hover:border-phosphor-dim hover:text-phosphor",
              aspect,
              !single && urls.length === 0 && pending === 0 && "col-span-2 sm:col-span-4 aspect-auto min-h-36",
            )}
          >
            <span className="flex flex-col items-center gap-1.5 text-center text-xs">
              <ImagePlus className="size-6" />
              <span className="text-[0.8125rem] font-medium text-ink-2">{urls.length ? "Add more" : single ? "Upload image" : "Add photos"}</span>
              <span>Drop images here or click to choose</span>
            </span>
          </button>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple={!single}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => upload(e.target.files)}
      />
      <p className="mt-2 text-[0.8125rem] text-ink-3">
        {hint ?? `PNG, JPG, WebP or GIF, up to 5 MB each.${single ? "" : ` Up to ${max}; the first is the cover on cards.`}`}
        {!single ? <span className="tnum"> ({urls.length}/{max})</span> : null}
      </p>
    </div>
  );
}

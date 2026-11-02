"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Uploads images to /api/upload and keeps their URLs in hidden inputs named
 * `name`, so the surrounding server-action form receives them.
 */
export function ImageUploader({
  name,
  initial = [],
  max = 8,
  folder = "listings",
}: {
  name: string;
  initial?: string[];
  max?: number;
  folder?: string;
}) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files).slice(0, max - urls.length)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", folder);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !json.url) {
          toast.error(json.error ?? "Upload failed.");
          continue;
        }
        setUrls((u) => [...u, json.url!]);
      }
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {urls.map((url, i) => (
          <div key={url} className="group relative aspect-[4/3] overflow-hidden rounded-[10px] border border-cab-4 bg-cab-3">
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
            {i === 0 ? <span className="chip chip-plain absolute bottom-1.5 left-1.5 bg-black/70">Cover</span> : null}
          </div>
        ))}
        {urls.length < max ? (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="grid aspect-[4/3] place-items-center rounded-[10px] border border-dashed border-cab-5 text-ink-3 transition-colors hover:border-phosphor-dim hover:text-phosphor"
          >
            <span className="flex flex-col items-center gap-1.5 text-xs">
              {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
              {busy ? "Uploading…" : "Add image"}
            </span>
          </button>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => upload(e.target.files)}
      />
      <p className="mt-2 text-[0.8125rem] text-ink-3">PNG, JPG, WebP or GIF, up to 5 MB each. The first image is the cover.</p>
    </div>
  );
}

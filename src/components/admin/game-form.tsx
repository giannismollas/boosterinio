"use client";

import { ActionForm, FieldError, SubmitButton } from "@/components/forms";
import { ImageUploader } from "@/components/image-uploader";
import type { ActionState } from "@/lib/action";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/catalog";

export type GameFormValue = {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  publisher: string | null;
  description: string | null;
  color: string;
  imageUrl: string | null;
  categories: string[];
  currencyName: string | null;
  platforms: string[];
  servers: string[];
  isActive: boolean;
  isFeatured: boolean;
  boostingEnabled: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
};

export function GameForm({
  action,
  game,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  game?: GameFormValue;
}) {
  return (
    <ActionForm action={action} className="space-y-6">
      {(state) => (
        <>
          {game ? <input type="hidden" name="id" value={game.id} /> : null}
          <section className="panel-flat grid gap-5 p-5 md:grid-cols-2">
            <h2 className="text-[0.9375rem] font-semibold text-ink md:col-span-2">Basics</h2>
            <div>
              <label htmlFor="g-name" className="label">
                Name
              </label>
              <input id="g-name" name="name" required defaultValue={game?.name} maxLength={60} className="field" aria-invalid={!!state?.fieldErrors?.name} />
              <FieldError state={state} name="name" />
            </div>
            <div>
              <label htmlFor="g-slug" className="label">
                URL slug
              </label>
              <input id="g-slug" name="slug" defaultValue={game?.slug} maxLength={60} placeholder="Generated from the name" className="field" aria-invalid={!!state?.fieldErrors?.slug} />
              <FieldError state={state} name="slug" />
              {!state?.fieldErrors?.slug ? <p className="mt-1.5 text-[0.8125rem] text-ink-3">Changing it breaks old links to this game.</p> : null}
            </div>
            <div>
              <label htmlFor="g-short" className="label">
                Short name
              </label>
              <input id="g-short" name="shortName" defaultValue={game?.shortName ?? ""} maxLength={8} placeholder="e.g. LoL" className="field" />
              <FieldError state={state} name="shortName" />
            </div>
            <div>
              <label htmlFor="g-publisher" className="label">
                Publisher
              </label>
              <input id="g-publisher" name="publisher" defaultValue={game?.publisher ?? ""} maxLength={60} className="field" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="g-desc" className="label">
                Description
              </label>
              <textarea id="g-desc" name="description" defaultValue={game?.description ?? ""} maxLength={600} className="field min-h-20" />
            </div>
            <div>
              <label htmlFor="g-color" className="label">
                Tile color
              </label>
              <div className="flex items-center gap-3">
                <input id="g-color" type="color" name="color" defaultValue={game?.color ?? "#2f6bff"} className="h-11 w-16 cursor-pointer rounded-[10px] border border-cab-4 bg-cab-3 p-1" />
                <span className="text-[0.8125rem] text-ink-3">Tints the game&apos;s tile on the select screen.</span>
              </div>
              <FieldError state={state} name="color" />
            </div>
            <div>
              <label htmlFor="g-sort" className="label">
                Sort order
              </label>
              <input id="g-sort" name="sortOrder" type="number" min={0} defaultValue={game?.sortOrder ?? 100} className="field" />
              <p className="mt-1.5 text-[0.8125rem] text-ink-3">Lower numbers show first.</p>
            </div>
            <div className="md:col-span-2">
              <span className="label">Cover image (optional)</span>
              <ImageUploader name="imageUrl" initial={game?.imageUrl ? [game.imageUrl] : []} max={1} folder="games" />
              <p className="mt-1.5 text-[0.8125rem] text-ink-3">Only upload artwork you have the rights to use. Without an image the tile uses the color and short name.</p>
            </div>
          </section>

          <section className="panel-flat grid gap-5 p-5 md:grid-cols-2">
            <h2 className="text-[0.9375rem] font-semibold text-ink md:col-span-2">Marketplace</h2>
            <fieldset className="md:col-span-2">
              <legend className="label">Categories sellers can list in</legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_ORDER.map((c) => (
                  <label key={c} className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-cab-4 bg-cab-3 px-3 py-2 text-sm text-ink has-[:checked]:border-phosphor-dim">
                    <input type="checkbox" name="categories" value={c} defaultChecked={game ? game.categories.includes(c) : c === "ACCOUNT"} className="accent-[#5cf2d6]" />
                    {CATEGORIES[c].label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="g-currency" className="label">
                In-game currency name
              </label>
              <input id="g-currency" name="currencyName" defaultValue={game?.currencyName ?? ""} maxLength={30} placeholder="e.g. Gold, V-Bucks" className="field" />
            </div>
            <div>
              <label htmlFor="g-platforms" className="label">
                Platforms
              </label>
              <input id="g-platforms" name="platforms" defaultValue={game?.platforms.join(", ") ?? ""} placeholder="PC, Console, Mobile" className="field" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="g-servers" className="label">
                Servers / regions
              </label>
              <input id="g-servers" name="servers" defaultValue={game?.servers.join(", ") ?? ""} placeholder="EUW, NA, OCE" className="field" />
              <p className="mt-1.5 text-[0.8125rem] text-ink-3">Comma separated. Used for listing filters.</p>
            </div>
          </section>

          <section className="panel-flat grid gap-5 p-5 md:grid-cols-2">
            <h2 className="text-[0.9375rem] font-semibold text-ink md:col-span-2">Visibility &amp; SEO</h2>
            <div className="flex flex-col gap-3 md:col-span-2">
              <label className="flex items-center gap-3 text-sm text-ink">
                <input type="checkbox" name="isActive" defaultChecked={game?.isActive ?? true} className="size-4 accent-[#5cf2d6]" />
                Visible on the site
              </label>
              <label className="flex items-center gap-3 text-sm text-ink">
                <input type="checkbox" name="isFeatured" defaultChecked={game?.isFeatured ?? false} className="size-4 accent-[#5cf2d6]" />
                Featured on the home page
              </label>
              <label className="flex items-center gap-3 text-sm text-ink">
                <input type="checkbox" name="boostingEnabled" defaultChecked={game?.boostingEnabled ?? false} className="size-4 accent-[#5cf2d6]" />
                Boosting is live (needs at least one active service)
              </label>
            </div>
            <div>
              <label htmlFor="g-seo-title" className="label">
                SEO title
              </label>
              <input id="g-seo-title" name="seoTitle" defaultValue={game?.seoTitle ?? ""} maxLength={80} className="field" placeholder="Defaults to the game name" />
            </div>
            <div>
              <label htmlFor="g-seo-desc" className="label">
                SEO description
              </label>
              <input id="g-seo-desc" name="seoDescription" defaultValue={game?.seoDescription ?? ""} maxLength={200} className="field" placeholder="Defaults to the description" />
            </div>
          </section>

          <div className="flex justify-end">
            <SubmitButton className="btn-coin btn-lg" pendingText="Saving…">
              {game ? "Save game" : "Create game"}
            </SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

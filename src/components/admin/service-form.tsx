"use client";

import { useState } from "react";
import { ActionForm, FieldError, SubmitButton } from "@/components/forms";
import { ImageUploader } from "@/components/image-uploader";
import type { ActionState } from "@/lib/action";

type Calc = "RANK" | "WINS" | "LEVEL" | "HOURS" | "FIXED";

export type ServiceFormValue = {
  id: string;
  gameId: string;
  name: string;
  slug: string;
  tagline: string | null;
  imageUrl: string | null;
  description: string | null;
  calculator: Calc;
  config: string;
  faq: string;
  isActive: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
};

const CALC_HELP: Record<Calc, string> = {
  RANK: "Tier and division ladder (e.g. Iron IV → Diamond I). Price per division step.",
  WINS: "A number of wins or games priced by the buyer's current rank or mode.",
  LEVEL: "From level X to level Y with price bands (mastery, account level).",
  HOURS: "Coaching sessions priced per hour by coach level.",
  FIXED: "Fixed packages with set prices.",
};

export function ServiceForm({
  action,
  games,
  templates,
  service,
  defaultGameId,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  games: { id: string; name: string; boostingEnabled: boolean }[];
  templates: Record<Calc, string>;
  service?: ServiceFormValue;
  defaultGameId?: string;
}) {
  const [calculator, setCalculator] = useState<Calc>(service?.calculator ?? "RANK");
  const [config, setConfig] = useState(service?.config ?? templates.RANK);
  const [gameId, setGameId] = useState(service?.gameId ?? defaultGameId ?? games[0]?.id ?? "");
  const game = games.find((g) => g.id === gameId);

  function changeCalculator(next: Calc) {
    // Swap in the template unless the admin already edited the config.
    if (config.trim() === templates[calculator].trim() || !config.trim()) setConfig(templates[next]);
    setCalculator(next);
  }

  return (
    <ActionForm action={action} className="space-y-6">
      {(state) => (
        <>
          {service ? <input type="hidden" name="id" value={service.id} /> : null}
          <section className="panel-flat grid gap-5 p-5 md:grid-cols-2">
            <h2 className="text-[0.9375rem] font-semibold text-ink md:col-span-2">Service</h2>
            <div>
              <label htmlFor="s-game" className="label">
                Game
              </label>
              <select id="s-game" name="gameId" value={gameId} onChange={(e) => setGameId(e.target.value)} className="field">
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                    {g.boostingEnabled ? "" : " (boosting off)"}
                  </option>
                ))}
              </select>
              <FieldError state={state} name="gameId" />
            </div>
            <div>
              <label htmlFor="s-sort" className="label">
                Sort order
              </label>
              <input id="s-sort" name="sortOrder" type="number" min={0} defaultValue={service?.sortOrder ?? 100} className="field" />
            </div>
            <div>
              <label htmlFor="s-name" className="label">
                Name
              </label>
              <input id="s-name" name="name" required maxLength={60} defaultValue={service?.name} placeholder="e.g. Rank Boost" className="field" aria-invalid={!!state?.fieldErrors?.name} />
              <FieldError state={state} name="name" />
            </div>
            <div>
              <label htmlFor="s-slug" className="label">
                URL slug
              </label>
              <input id="s-slug" name="slug" maxLength={60} defaultValue={service?.slug} placeholder="Generated from the name" className="field" aria-invalid={!!state?.fieldErrors?.slug} />
              <FieldError state={state} name="slug" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="s-tagline" className="label">
                Tagline
              </label>
              <input id="s-tagline" name="tagline" maxLength={140} defaultValue={service?.tagline ?? ""} placeholder="One line shown on service cards" className="field" />
            </div>
            <div className="md:col-span-2">
              <span className="label">Card image (optional)</span>
              <div className="max-w-md">
                <ImageUploader
                  name="imageUrl"
                  initial={service?.imageUrl ? [service.imageUrl] : []}
                  max={1}
                  folder="services"
                  aspect="aspect-[16/7]"
                  hint="Shown on the service's card on the game page. Wide images work best (1200 × 525). Only upload art you have the rights to use."
                />
              </div>
              <FieldError state={state} name="imageUrl" />
            </div>
            <div className="flex flex-col gap-3 md:col-span-2">
              <label className="flex items-center gap-3 text-sm text-ink">
                <input type="checkbox" name="isActive" defaultChecked={service?.isActive ?? true} className="size-4 accent-[#ff2e88]" />
                Active (buyers can order it)
              </label>
              {game && !game.boostingEnabled ? (
                <label className="flex items-center gap-3 text-sm text-ink">
                  <input type="checkbox" name="enableBoosting" defaultChecked className="size-4 accent-[#ff2e88]" />
                  Also turn on boosting for {game.name}
                </label>
              ) : null}
            </div>
          </section>

          <section className="panel-flat space-y-5 p-5">
            <div>
              <h2 className="text-[0.9375rem] font-semibold text-ink">Pricing</h2>
              <p className="mt-1 text-[0.8125rem] text-ink-3">Amounts are in cents (1250 = 12.50). Multipliers of 1 mean no change; 1.2 adds 20%.</p>
            </div>
            <div>
              <label htmlFor="s-calc" className="label">
                Calculator
              </label>
              <select id="s-calc" name="calculator" value={calculator} onChange={(e) => changeCalculator(e.target.value as Calc)} className="field md:max-w-sm">
                <option value="RANK">Rank ladder</option>
                <option value="WINS">Wins / games</option>
                <option value="LEVEL">Level range</option>
                <option value="HOURS">Hourly coaching</option>
                <option value="FIXED">Fixed packages</option>
              </select>
              <p className="mt-1.5 text-[0.8125rem] text-ink-3">{CALC_HELP[calculator]}</p>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="s-config" className="label mb-0">
                  Config (JSON)
                </label>
                <button type="button" onClick={() => setConfig(templates[calculator])} className="text-[0.8125rem] text-phosphor hover:underline">
                  Reset to template
                </button>
              </div>
              <textarea
                id="s-config"
                name="config"
                value={config}
                onChange={(e) => setConfig(e.target.value)}
                spellCheck={false}
                className="field min-h-[420px] font-mono text-[0.8125rem] leading-relaxed"
                aria-invalid={!!state?.fieldErrors?.config}
              />
              {state?.fieldErrors?.config ? <pre className="mt-2 rounded-[10px] border border-bad/40 bg-bad/[0.06] p-3 text-[0.8125rem] whitespace-pre-wrap text-bad">{state.fieldErrors.config}</pre> : null}
            </div>
          </section>

          <section className="panel-flat grid gap-5 p-5 md:grid-cols-2">
            <h2 className="text-[0.9375rem] font-semibold text-ink md:col-span-2">Page content &amp; SEO</h2>
            <div className="md:col-span-2">
              <label htmlFor="s-desc" className="label">
                Description
              </label>
              <textarea id="s-desc" name="description" defaultValue={service?.description ?? ""} className="field min-h-56 text-[0.875rem]" placeholder={"## How it works\nExplain the service. Supports ## headings, - lists, **bold** and [links](https://example.com)."} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="s-faq" className="label">
                FAQ (JSON)
              </label>
              <textarea
                id="s-faq"
                name="faq"
                defaultValue={service?.faq ?? "[]"}
                spellCheck={false}
                className="field min-h-40 font-mono text-[0.8125rem]"
                placeholder='[{"q": "How long does it take?", "a": "Usually 1–3 days."}]'
                aria-invalid={!!state?.fieldErrors?.faq}
              />
              {state?.fieldErrors?.faq ? <pre className="mt-2 text-[0.8125rem] whitespace-pre-wrap text-bad">{state.fieldErrors.faq}</pre> : null}
            </div>
            <div>
              <label htmlFor="s-seo-title" className="label">
                SEO title
              </label>
              <input id="s-seo-title" name="seoTitle" maxLength={80} defaultValue={service?.seoTitle ?? ""} className="field" />
            </div>
            <div>
              <label htmlFor="s-seo-desc" className="label">
                SEO description
              </label>
              <input id="s-seo-desc" name="seoDescription" maxLength={200} defaultValue={service?.seoDescription ?? ""} className="field" />
            </div>
          </section>

          <div className="flex justify-end">
            <SubmitButton className="btn-coin btn-lg" pendingText="Saving…">
              {service ? "Save service" : "Create service"}
            </SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

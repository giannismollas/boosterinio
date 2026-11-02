"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { FieldError, SubmitButton } from "@/components/forms";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/utils";
import { APPLICATION_TYPES, type ApplicationTypeId } from "./constants";

type Defaults = {
  applicationType: ApplicationTypeId;
  displayName: string;
  country: string;
  discord: string;
  games: string[];
  experience: string;
  peakRank: string;
  servers: string;
  proofUrl: string;
};

export function ApplicationForm({
  action,
  games,
  defaults,
  resubmit = false,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  games: { slug: string; name: string; boosting: boolean }[];
  defaults: Defaults;
  resubmit?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const [type, setType] = useState<ApplicationTypeId>(defaults.applicationType);
  const booster = type !== "SELLER";

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    else if (state?.ok && state.message) toast.success(state.message);
  }, [state]);

  const invalid = (name: string) => (state?.fieldErrors?.[name] ? true : undefined);

  return (
    <form action={formAction} className="space-y-8" noValidate>
      <fieldset>
        <legend className="label">What do you want to do?</legend>
        <div className="mt-1 grid gap-3 sm:grid-cols-3">
          {APPLICATION_TYPES.map((t) => {
            const active = type === t.id;
            return (
              <label
                key={t.id}
                data-active={active}
                className={cn(
                  "cursor-frame block cursor-pointer rounded-[12px] border p-4 transition-colors [--cursor:var(--color-p1)]",
                  active ? "border-p2 bg-p2/10" : "border-cab-4 bg-cab-3 hover:border-cab-5",
                )}
              >
                <input
                  type="radio"
                  name="applicationType"
                  value={t.id}
                  checked={active}
                  onChange={() => setType(t.id)}
                  className="sr-only"
                />
                <span className="t-display block text-2xl text-ink uppercase">{t.label}</span>
                <span className="mt-1 block text-[0.8125rem] leading-snug text-ink-2">{t.description}</span>
              </label>
            );
          })}
        </div>
        <FieldError state={state} name="applicationType" />
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="displayName" className="label">
            Store name
          </label>
          <input
            id="displayName"
            name="displayName"
            className="field"
            defaultValue={defaults.displayName}
            maxLength={32}
            autoComplete="nickname"
            aria-invalid={invalid("displayName")}
            required
          />
          <p className="mt-1.5 text-[0.8125rem] text-ink-3">Buyers see this on your listings and storefront.</p>
          <FieldError state={state} name="displayName" />
        </div>
        <div>
          <label htmlFor="discord" className="label">
            Discord username
          </label>
          <input
            id="discord"
            name="discord"
            className="field"
            defaultValue={defaults.discord}
            maxLength={40}
            placeholder="username"
            aria-invalid={invalid("discord")}
            required
          />
          <p className="mt-1.5 text-[0.8125rem] text-ink-3">Staff may contact you here about your application.</p>
          <FieldError state={state} name="discord" />
        </div>
        <div>
          <label htmlFor="country" className="label">
            Country
          </label>
          <input
            id="country"
            name="country"
            className="field"
            defaultValue={defaults.country}
            maxLength={56}
            autoComplete="country-name"
            aria-invalid={invalid("country")}
            required
          />
          <FieldError state={state} name="country" />
        </div>
      </div>

      <fieldset>
        <legend className="label">Games you {booster ? "sell or boost" : "sell"}</legend>
        <div className="mt-1 grid max-h-72 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto rounded-[12px] border border-cab-4 bg-cab-3 p-3 sm:grid-cols-3">
          {games.map((g) => (
            <label key={g.slug} className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-[8px] px-2 text-sm text-ink-2 hover:bg-cab-4 hover:text-ink">
              <input
                type="checkbox"
                name="games"
                value={g.slug}
                defaultChecked={defaults.games.includes(g.slug)}
                className="size-4 shrink-0 accent-[#2f6bff]"
              />
              <span className="truncate">{g.name}</span>
              {g.boosting ? <span className="ml-auto shrink-0 font-pixel text-[0.625rem] text-phosphor uppercase">Boosting</span> : null}
            </label>
          ))}
        </div>
        <FieldError state={state} name="games" />
      </fieldset>

      <div>
        <label htmlFor="experience" className="label">
          Your experience
        </label>
        <textarea
          id="experience"
          name="experience"
          className="field min-h-36"
          defaultValue={defaults.experience}
          maxLength={2000}
          placeholder={
            booster
              ? "How long you've played, the ranks you've held each season, whether you've boosted before and where."
              : "What you sell, where your stock comes from, and any shops or marketplaces you've sold on before."
          }
          aria-invalid={invalid("experience")}
          required
        />
        <FieldError state={state} name="experience" />
      </div>

      {booster ? (
        <div className="grid gap-5 rounded-[14px] border border-cab-4 bg-cab-3/60 p-5 sm:grid-cols-2">
          <div>
            <label htmlFor="peakRank" className="label">
              Peak rank
            </label>
            <input
              id="peakRank"
              name="peakRank"
              className="field"
              defaultValue={defaults.peakRank}
              maxLength={40}
              placeholder="Grandmaster 450 LP"
              aria-invalid={invalid("peakRank")}
            />
            <FieldError state={state} name="peakRank" />
          </div>
          <div>
            <label htmlFor="servers" className="label">
              Servers you can play on
            </label>
            <input id="servers" name="servers" className="field" defaultValue={defaults.servers} maxLength={200} placeholder="EUW, EUNE" />
            <p className="mt-1.5 text-[0.8125rem] text-ink-3">Separate servers with commas.</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="proofUrl" className="label">
              Profile link
            </label>
            <input
              id="proofUrl"
              name="proofUrl"
              type="url"
              inputMode="url"
              className="field"
              defaultValue={defaults.proofUrl}
              placeholder="https://www.op.gg/summoners/euw/Name-TAG"
              aria-invalid={invalid("proofUrl")}
            />
            <p className="mt-1.5 text-[0.8125rem] text-ink-3">A public stats page (op.gg, u.gg or similar) for your main account.</p>
            <FieldError state={state} name="proofUrl" />
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="proofUrl" className="label">
            Shop or profile link (optional)
          </label>
          <input
            id="proofUrl"
            name="proofUrl"
            type="url"
            inputMode="url"
            className="field"
            defaultValue={defaults.proofUrl}
            placeholder="https://"
            aria-invalid={invalid("proofUrl")}
          />
          <p className="mt-1.5 text-[0.8125rem] text-ink-3">A store or marketplace profile where buyers have reviewed you.</p>
          <FieldError state={state} name="proofUrl" />
        </div>
      )}

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-2">
          <input type="checkbox" name="terms" className="mt-0.5 size-4 shrink-0 accent-[#2f6bff]" required />
          <span>
            I&apos;ll deliver what I list, keep all communication in the order chat, and follow the{" "}
            <a href="/terms" className="text-phosphor underline" target="_blank">
              terms of service
            </a>
            . I understand staff can suspend sellers or boosters who break them.
          </span>
        </label>
        <FieldError state={state} name="terms" />
      </div>

      <SubmitButton className="btn-coin btn-lg w-full sm:w-auto" pendingText="Sending application…">
        {resubmit ? "Send application again" : "Submit application"}
      </SubmitButton>
    </form>
  );
}

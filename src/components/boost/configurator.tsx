"use client";

import { ChevronRight, Minus, Plus, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { useActionState, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  addonPct,
  blockedModes,
  formatEta,
  ladderIndex,
  ladderLength,
  ladderPoint,
  parseConfig,
  quoteService,
  rankLabel,
  type Addon,
  type CalculatorKind,
  type FixedConfig,
  type HoursConfig,
  type LevelConfig,
  type MultiplierOption,
  type QuoteLine,
  type RankConfig,
  type WinsConfig,
  winsTierLabel,
} from "@/lib/boosting/engine";
import { cn, formatMoney } from "@/lib/utils";
import { startBoostCheckout } from "@/server/actions/checkout";
import { RankCrest, tierTint } from "../rank-crest";
import { CoinSlotIcon, CoinStack } from "../marks";
import { useAnimatedNumber } from "./use-animated-number";

export type ConfiguratorService = {
  id: string;
  name: string;
  calculator: CalculatorKind;
  config: unknown;
  /** canonical page path, used to come back after sign-in */
  path: string;
};

type Sel = Record<string, unknown>;

/** Rank names with soft hyphens at natural break points ("Grand-master"). */
function breakable(name: string) {
  return name.replace(/(Grand)(master)|(Chal)(lenger)|(Plat)(inum)|(Dia)(mond)|(Em)(erald)/i, (_m, ...g: (string | undefined)[]) =>
    g.slice(0, 10).filter(Boolean).join("\u00AD"),
  );
}

const KNOWN_TIERS = new Set(["unranked", "iron", "bronze", "silver", "gold", "platinum", "emerald", "diamond", "master", "grandmaster", "challenger"]);

export function Configurator({ service, initial }: { service: ConfiguratorService; initial: Sel }) {
  const parsed = useMemo(() => parseConfig(service.calculator, service.config), [service.calculator, service.config]);
  const [sel, setSel] = useState<Sel>(initial);
  const result = useMemo(() => quoteService(service, sel), [service, sel]);

  // Keep the URL in sync so sign-in (and sharing) returns to the same configuration.
  useEffect(() => {
    const t = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("s", JSON.stringify(sel));
      window.history.replaceState(window.history.state, "", url);
    }, 250);
    return () => clearTimeout(t);
  }, [sel]);

  if (!parsed.success) {
    return <p className="panel-flat p-6 text-ink-2">This service is being set up. Please check back soon.</p>;
  }

  const set = (patch: Sel) => setSel((s) => ({ ...s, ...patch }));
  const cfg = parsed.data;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <ModeGuard calculator={service.calculator} config={service.config} modes={cfg.modes} sel={sel} set={set} />
      <div className="min-w-0 space-y-5">
        {service.calculator === "RANK" && <RankControls cfg={cfg as RankConfig} sel={sel} set={set} />}
        {service.calculator === "WINS" && <WinsControls cfg={cfg as WinsConfig} sel={sel} set={set} />}
        {service.calculator === "LEVEL" && <LevelControls cfg={cfg as LevelConfig} sel={sel} set={set} />}
        {service.calculator === "HOURS" && <HoursControls cfg={cfg as HoursConfig} sel={sel} set={set} />}
        {service.calculator === "FIXED" && <FixedControls cfg={cfg as FixedConfig} sel={sel} set={set} />}
        <CommonControls cfg={cfg} sel={sel} set={set} calculator={service.calculator} />
        <CoinBar service={service} sel={sel} result={result} />
      </div>
      <aside className="lg:sticky lg:top-24">
        <Readout service={service} cfg={cfg} sel={sel} set={set} result={result} />
      </aside>
    </div>
  );
}

// ───────────────────────── shared pieces ─────────────────────────

/** Switches to an allowed play mode when the chosen rank rules the current one out (no duo at GM+). */
export function ModeGuard({
  calculator,
  config,
  modes,
  sel,
  set,
}: {
  calculator: CalculatorKind;
  config: unknown;
  modes: MultiplierOption[];
  sel: Sel;
  set: (p: Sel) => void;
}) {
  const blocked = blockedModes(calculator, config, sel);
  const mode = String(sel.mode ?? modes[0]?.id ?? "");
  const next = blocked.has(mode) ? modes.find((m) => !blocked.has(m.id)) : undefined;
  useEffect(() => {
    if (next) set({ mode: next.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next?.id]);
  return null;
}

/** Number field for the current LP of apex tiers (Master and above). */
function LpInput({ value, onChange }: { value: unknown; onChange: (n: number | undefined) => void }) {
  return (
    <div className="mt-4 max-w-56">
      <label htmlFor="cfg-lp" className="label">
        Current LP
      </label>
      <input
        id="cfg-lp"
        type="number"
        inputMode="numeric"
        min={0}
        max={5000}
        className="field tnum"
        placeholder="0"
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(e) => {
          const n = e.target.value === "" ? undefined : Math.max(0, Math.min(5000, Math.floor(Number(e.target.value))));
          onChange(Number.isFinite(n) ? n : undefined);
        }}
      />
    </div>
  );
}

function Panel({ title, titleId, children, aside }: { title: string; titleId?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id={titleId} className="slash-label text-[1.0625rem]">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Select({ label, value, options, onChange }: { label: string; value: string | undefined; options: { id: string; label: string }[]; onChange: (v: string) => void }) {
  const id = `sel-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select id={id} className="field" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Segmented({ label, value, options, onChange }: { label: string; value: string | undefined; options: MultiplierOption[]; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-[11px] border border-cab-4 bg-cab-3 p-1">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              "h-9 rounded-[8px] px-2 text-sm transition-colors",
              value === o.id ? "bg-p2 font-medium text-white shadow-[0_0_0_1px_rgb(255_46_136/0.5),0_0_16px_-4px_rgb(255_46_136/0.8)]" : "text-ink-2 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Stepper({ label, value, min, max, onChange, suffix }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; suffix?: string }) {
  const clampN = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex items-center gap-3">
        <button type="button" className="btn btn-ghost size-11 px-0" onClick={() => onChange(clampN(value - 1))} disabled={value <= min} aria-label={`Fewer ${suffix ?? ""}`}>
          <Minus className="size-4" />
        </button>
        <output className="t-display min-w-16 text-center text-4xl text-ink tnum" aria-live="polite">
          {value}
        </output>
        <button type="button" className="btn btn-ghost size-11 px-0" onClick={() => onChange(clampN(value + 1))} disabled={value >= max} aria-label={`More ${suffix ?? ""}`}>
          <Plus className="size-4" />
        </button>
        {suffix ? <span className="text-sm text-ink-3">{suffix}</span> : null}
      </div>
      {max - min > 4 ? (
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(clampN(Number(e.target.value)))}
          className="mt-4 w-full accent-[#ff2e88]"
          aria-label={label}
        />
      ) : null}
    </div>
  );
}

/** Tier picker: emblems in rows of five (six for eleven tiers); the chosen tile gets a pink frame and a tag. */
export function TierPicker({
  tiers,
  value,
  onChange,
  tag,
  isDisabled,
  labelledBy,
}: {
  tiers: { id: string; name: string; image?: string }[];
  value: string | undefined;
  onChange: (id: string) => void;
  tag: string;
  isDisabled?: (id: string) => boolean;
  /** id of the heading that names this picker ("Your rank", "Goal") */
  labelledBy?: string;
}) {
  const visual = tiers.every((t) => t.image || KNOWN_TIERS.has(t.id));
  if (!visual) {
    return (
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={labelledBy}>
        {tiers.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={value === t.id}
            onClick={() => onChange(t.id)}
            className={cn("btn btn-sm", value === t.id ? "btn-p1" : "btn-ghost")}
          >
            {t.name}
          </button>
        ))}
      </div>
    );
  }
  const cols = Math.min(6, tiers.length <= 6 ? tiers.length : Math.ceil(tiers.length / 2));
  return (
    <div
      className="grid gap-x-1 gap-y-2 pt-2 sm:gap-x-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      role="group"
      aria-labelledby={labelledBy}
    >
      {tiers.map((t, i) => {
        const active = value === t.id;
        const disabled = isDisabled?.(t.id) ?? false;
        return (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            aria-label={t.name}
            data-active={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "cursor-frame group relative flex flex-col items-center gap-1 rounded-[12px] px-0.5 pt-2.5 pb-2",
              !active && "hover:bg-white/[0.03]",
              disabled && "pointer-events-none opacity-30 grayscale-[0.6]",
            )}
          >
            {active ? (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-p2 px-2 font-pixel text-[0.625rem] leading-[18px] text-white shadow-[0_0_12px_rgb(255_46_136/0.7)]">
                {tag}
              </span>
            ) : null}
            {t.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.image}
                alt=""
                loading="lazy"
                className="h-10 w-12 object-contain drop-shadow-[0_4px_8px_rgb(0_0_0/0.6)] transition-transform duration-200 group-hover:-translate-y-0.5 sm:h-12 sm:w-16"
              />
            ) : (
              <RankCrest tier={t.id} index={i} className="h-10 w-10 transition-transform duration-200 group-hover:-translate-y-0.5 sm:h-12 sm:w-12" />
            )}
            <span className={cn("hyphenate w-full text-center text-[0.6875rem] leading-tight sm:text-[0.8125rem]", active ? "text-white" : "text-ink-2")} lang="en">
              {breakable(t.name)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function DivisionPicker({
  count,
  labels,
  value,
  onChange,
  isDisabled,
  label,
}: {
  count: number;
  labels: string[];
  value: number;
  onChange: (d: number) => void;
  isDisabled?: (d: number) => boolean;
  /** what the division belongs to, e.g. "Your rank" */
  label?: string;
}) {
  if (count === 0) return <p className="mt-3 text-sm text-ink-3">This tier has no divisions; it's ranked by LP.</p>;
  const shown = labels.slice(-count);
  return (
    <div className="mt-3.5 flex gap-2" role="group" aria-label={label ? `${label}: division` : "Division"}>
      {shown.map((label, d) => {
        const disabled = isDisabled?.(d) ?? false;
        return (
          <button
            key={label}
            type="button"
            disabled={disabled}
            aria-pressed={value === d}
            onClick={() => onChange(d)}
            className={cn("btn btn-sm h-8 min-w-[3.25rem] rounded-[8px] px-3 text-[0.8125rem]", value === d ? "btn-p1" : "btn-ghost", disabled && "opacity-30")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────── calculator controls ─────────────────────────

function RankControls({ cfg, sel, set }: { cfg: RankConfig; sel: Sel; set: (p: Sel) => void }) {
  const fromTier = String(sel.fromTier ?? cfg.tiers[0].id);
  const fromDivision = Number(sel.fromDivision ?? 0);
  const toTier = String(sel.toTier ?? cfg.tiers[1].id);
  const toDivision = Number(sel.toDivision ?? 0);
  const fromIdx = ladderIndex(cfg, fromTier, fromDivision);
  const last = ladderLength(cfg) - 1;

  const tierMaxIndex = (id: string) => {
    const t = cfg.tiers.find((x) => x.id === id);
    return ladderIndex(cfg, id, Math.max(0, (t?.divisions ?? 1) - 1));
  };

  // Moving the start past the goal pushes the goal one step above it.
  const setFrom = (tier: string, division: number) => {
    const idx = ladderIndex(cfg, tier, division);
    const toIdx = ladderIndex(cfg, toTier, toDivision);
    const patch: Sel = { fromTier: tier, fromDivision: division };
    if (toIdx <= idx) {
      const next = ladderPoint(cfg, Math.min(idx + 1, last));
      if (next) Object.assign(patch, { toTier: next.tier.id, toDivision: next.division });
    }
    set(patch);
  };

  const fromTierObj = cfg.tiers.find((t) => t.id === fromTier);
  const toTierObj = cfg.tiers.find((t) => t.id === toTier);
  const fromId = useId();
  const toId = useId();

  return (
    <>
      <Panel title="Current rank" titleId={fromId} aside={<span className="text-sm text-ink-3">{rankLabel(cfg, fromTier, fromDivision)}</span>}>
        <TierPicker
          tiers={cfg.tiers}
          value={fromTier}
          labelledBy={fromId}
          tag="P1"
          isDisabled={(id) => ladderIndex(cfg, id, 0) >= last}
          onChange={(id) => {
            const t = cfg.tiers.find((x) => x.id === id)!;
            setFrom(id, Math.min(fromDivision, Math.max(0, t.divisions - 1)));
          }}
        />
        <DivisionPicker
          label="Current rank"
          count={fromTierObj?.divisions ?? 0}
          labels={cfg.divisionLabels}
          value={fromDivision}
          onChange={(d) => setFrom(fromTier, d)}
          isDisabled={(d) => ladderIndex(cfg, fromTier, d) >= last}
        />
        {fromTierObj?.lpInput ? <LpInput value={sel.currentLp} onChange={(n) => set({ currentLp: n })} /> : null}
        {(cfg.lpBrackets.length > 0 || cfg.lpGain.length > 0) && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {cfg.lpBrackets.length > 0 && !fromTierObj?.lpInput ? (
              <Select label="Current LP" value={sel.lp as string} options={cfg.lpBrackets} onChange={(v) => set({ lp: v })} />
            ) : null}
            {cfg.lpGain.length > 0 && <Select label="LP gained per win" value={sel.lpGain as string} options={cfg.lpGain} onChange={(v) => set({ lpGain: v })} />}
          </div>
        )}
      </Panel>

      <Panel title="Desired rank" titleId={toId} aside={<span className="text-sm text-ink-3">{rankLabel(cfg, toTier, toDivision)}</span>}>
        <TierPicker
          tiers={cfg.tiers}
          value={toTier}
          labelledBy={toId}
          tag="GOAL"
          isDisabled={(id) => tierMaxIndex(id) <= fromIdx}
          onChange={(id) => {
            const t = cfg.tiers.find((x) => x.id === id)!;
            let d = Math.min(toDivision, Math.max(0, t.divisions - 1));
            while (t.divisions > 0 && ladderIndex(cfg, id, d) <= fromIdx && d < t.divisions - 1) d++;
            set({ toTier: id, toDivision: d });
          }}
        />
        <DivisionPicker
          label="Desired rank"
          count={toTierObj?.divisions ?? 0}
          labels={cfg.divisionLabels}
          value={toDivision}
          onChange={(d) => set({ toDivision: d })}
          isDisabled={(d) => ladderIndex(cfg, toTier, d) <= fromIdx}
        />
      </Panel>
    </>
  );
}

function WinsControls({ cfg, sel, set }: { cfg: WinsConfig; sel: Sel; set: (p: Sel) => void }) {
  const count = Number(sel.count ?? cfg.defaultCount);
  const tier = cfg.tiers.find((t) => t.id === sel.tier);
  const division = Number(sel.division ?? 0);
  const tierId = useId();
  return (
    <>
      <Panel title={cfg.tierLabel} titleId={tierId} aside={tier ? <span className="text-sm text-ink-3">{winsTierLabel(cfg, tier.id, division)}</span> : null}>
        <TierPicker
          tiers={cfg.tiers}
          value={sel.tier as string}
          labelledBy={tierId}
          tag="P1"
          onChange={(id) => {
            const t = cfg.tiers.find((x) => x.id === id);
            set({ tier: id, division: Math.min(division, Math.max(0, (t?.divisions ?? 1) - 1)) });
          }}
        />
        {tier && tier.divisions > 0 ? (
          <DivisionPicker label={cfg.tierLabel} count={tier.divisions} labels={cfg.divisionLabels} value={division} onChange={(d) => set({ division: d })} />
        ) : null}
        {tier?.lpInput ? <LpInput value={sel.currentLp} onChange={(n) => set({ currentLp: n })} /> : null}
      </Panel>
      <Panel title={`Number of ${cfg.unitLabelPlural}`}>
        <Stepper label={`How many ${cfg.unitLabelPlural}?`} value={count} min={cfg.min} max={cfg.max} onChange={(n) => set({ count: n })} suffix={count === 1 ? cfg.unitLabel : cfg.unitLabelPlural} />
      </Panel>
    </>
  );
}

function LevelControls({ cfg, sel, set }: { cfg: LevelConfig; sel: Sel; set: (p: Sel) => void }) {
  const from = Number(sel.from ?? cfg.min);
  const to = Number(sel.to ?? cfg.min + 1);
  const unit = cfg.unitLabel;
  return (
    <Panel title={unit.replace(/^\w/, (c) => c.toUpperCase())}>
      {cfg.subjectLabel ? (
        <div className="mb-5">
          <label htmlFor="cfg-subject" className="label">
            {cfg.notesLabel ?? cfg.subjectLabel}
          </label>
          {cfg.subjectOptions.length ? (
            <select id="cfg-subject" className="field" value={String(sel.notes ?? "")} onChange={(e) => set({ notes: e.target.value })}>
              {cfg.subjectOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input id="cfg-subject" className="field" maxLength={60} value={String(sel.notes ?? "")} onChange={(e) => set({ notes: e.target.value })} placeholder={cfg.subjectLabel} />
          )}
        </div>
      ) : null}
      <div className="grid gap-6 sm:grid-cols-2">
        <Stepper label="Current" value={from} min={cfg.min} max={cfg.max - 1} onChange={(n) => set({ from: n, to: Math.max(to, n + 1) })} />
        <Stepper label="Desired" value={to} min={from + 1} max={cfg.max} onChange={(n) => set({ to: n })} />
      </div>
    </Panel>
  );
}

function HoursControls({ cfg, sel, set }: { cfg: HoursConfig; sel: Sel; set: (p: Sel) => void }) {
  return (
    <>
      <Panel title="Coach">
        <div className="grid gap-3 sm:grid-cols-3">
          {cfg.rates.map((r) => {
            const active = sel.rate === r.id;
            return (
              <button
                key={r.id}
                type="button"
                aria-pressed={active}
                data-active={active}
                onClick={() => set({ rate: r.id })}
                className={cn(
                  "cursor-frame rounded-[12px] border p-4 text-left transition-colors",
                  active ? "border-transparent" : "border-cab-4 hover:bg-cab-3",
                )}
              >
                <p className="font-medium text-ink">{r.label}</p>
                {r.description ? <p className="mt-1 text-[0.8125rem] leading-snug text-ink-3">{r.description}</p> : null}
                <p className="t-display mt-3 text-2xl text-ink tnum">
                  {formatMoney(r.hourly)}
                  <span className="text-base text-ink-3"> / h</span>
                </p>
              </button>
            );
          })}
        </div>
      </Panel>
      <Panel title="Hours">
        <Stepper label="Session length" value={Number(sel.hours ?? cfg.min)} min={cfg.min} max={cfg.max} onChange={(n) => set({ hours: n })} suffix="hours" />
      </Panel>
    </>
  );
}

function FixedControls({ cfg, sel, set }: { cfg: FixedConfig; sel: Sel; set: (p: Sel) => void }) {
  return (
    <Panel title="Package">
      <div className="grid gap-3 sm:grid-cols-2">
        {cfg.packages.map((p) => {
          const active = sel.package === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={active}
              data-active={active}
              onClick={() => set({ package: p.id })}
              className={cn("cursor-frame rounded-[12px] border p-4 text-left", active ? "border-transparent" : "border-cab-4 hover:bg-cab-3")}
            >
              <p className="font-medium text-ink">{p.label}</p>
              {p.description ? <p className="mt-1 text-[0.8125rem] text-ink-3">{p.description}</p> : null}
              <p className="t-display mt-3 text-2xl text-ink tnum">{formatMoney(p.price)}</p>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function CommonControls({
  cfg,
  sel,
  set,
  calculator,
}: {
  cfg: {
    servers: MultiplierOption[];
    queues: MultiplierOption[];
    modes: MultiplierOption[];
    addons: Addon[];
    notesLabel?: string;
    optionGroups: { id: string; label: string; options: MultiplierOption[] }[];
  };
  sel: Sel;
  set: (p: Sel) => void;
  calculator: CalculatorKind;
}) {
  const mode = String(sel.mode ?? cfg.modes[0]?.id ?? "");
  const chosen = new Set((sel.addons as string[] | undefined) ?? []);
  const addons = cfg.addons.filter((a) => !a.modes.length || !mode || a.modes.includes(mode));
  const showNotes = cfg.notesLabel && !(calculator === "LEVEL");
  // Tier that prices per-tier extras: the goal for rank boosts, the chosen rank otherwise.
  const tierCtx = calculator === "RANK" ? String(sel.toTier ?? "") : String(sel.tier ?? "");
  const opts = (sel.opts as Record<string, string> | undefined) ?? {};
  return (
    <>
      <Panel title={cfg.queues.length > 1 ? "Server & queue" : cfg.optionGroups.length ? "Server & options" : "Server"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Server" value={sel.server as string} options={cfg.servers} onChange={(v) => set({ server: v })} />
          {cfg.queues.length > 1 ? <Segmented label="Queue" value={(sel.queue as string) ?? cfg.queues[0].id} options={cfg.queues} onChange={(v) => set({ queue: v })} /> : null}
          {cfg.optionGroups.map((g) =>
            g.options.length <= 4 ? (
              <Segmented key={g.id} label={g.label} value={opts[g.id] ?? g.options[0].id} options={g.options} onChange={(v) => set({ opts: { ...opts, [g.id]: v } })} />
            ) : (
              <Select key={g.id} label={g.label} value={opts[g.id] ?? g.options[0].id} options={g.options} onChange={(v) => set({ opts: { ...opts, [g.id]: v } })} />
            ),
          )}
        </div>
      </Panel>
      {(addons.length > 0 || showNotes) && (
        <Panel title="Extras">
          {addons.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {addons.map((a) => {
                const on = a.included || chosen.has(a.id);
                const pct = addonPct(a, tierCtx);
                const price = a.included ? "Included" : pct ? `+${pct}%` : a.flat ? `+${formatMoney(a.flat)}` : "Free";
                return (
                  <li key={a.id}>
                    <label
                      className={cn(
                        "flex h-full items-start gap-3 rounded-[12px] border p-3.5 transition-colors",
                        a.included ? "cursor-default" : "cursor-pointer",
                        on ? "border-phosphor-dim/60 bg-[rgb(255_46_136/0.06)]" : "border-cab-4 hover:bg-cab-3",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 shrink-0 accent-[#ff2e88]"
                        checked={on}
                        disabled={a.included}
                        onChange={(e) => {
                          const next = new Set(chosen);
                          if (e.target.checked) next.add(a.id);
                          else next.delete(a.id);
                          set({ addons: [...next] });
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-ink">{a.label}</span>
                          <span className={cn("shrink-0 font-pixel text-[0.6875rem] uppercase", price === "Free" || price === "Included" ? "text-ok" : "text-ink-2")}>{price}</span>
                        </span>
                        {a.description ? <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-3">{a.description}</span> : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {showNotes ? (
            <div className={addons.length ? "mt-5" : ""}>
              <label htmlFor="cfg-notes" className="label">
                {cfg.notesLabel}
              </label>
              <textarea
                id="cfg-notes"
                className="field min-h-20"
                maxLength={400}
                value={String(sel.notes ?? "")}
                onChange={(e) => set({ notes: e.target.value })}
                placeholder="For example: jungle main, Lee Sin, Viego. No Yuumi."
              />
            </div>
          ) : null}
        </Panel>
      )}
    </>
  );
}

// ───────────────────────── readout (the CRT) ─────────────────────────

export function ModeButtons({
  modes,
  value,
  onChange,
  blocked,
}: {
  modes: MultiplierOption[];
  value: string;
  onChange: (id: string) => void;
  blocked?: Map<string, string>;
}) {
  if (modes.length < 2) return null;
  const reason = blocked ? [...blocked.values()][0] : undefined;
  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Play mode">
        {modes.map((m, i) => {
          const active = value === m.id;
          const locked = blocked?.has(m.id) ?? false;
          const Icon = i === 0 ? UserRound : UsersRound;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={active}
              disabled={locked}
              data-active={active}
              title={locked ? blocked?.get(m.id) : undefined}
              onClick={() => onChange(m.id)}
              className={cn(
                "cursor-frame flex items-start gap-2.5 rounded-[12px] border p-3 text-left",
                active ? "border-transparent" : "border-white/[0.07] hover:bg-white/[0.03]",
                locked && "cursor-not-allowed opacity-35 hover:bg-transparent",
              )}
            >
              <Icon className={cn("mt-0.5 size-4 shrink-0", active ? "text-p1" : "text-ink-3")} aria-hidden />
              <span className="min-w-0">
                <span className="block font-pixel text-xs text-ink uppercase">{m.label}</span>
                {locked ? (
                  <span className="mt-0.5 block text-[0.75rem] leading-snug text-warn">Not available at this rank</span>
                ) : m.description ? (
                  <span className="mt-0.5 block text-[0.75rem] leading-snug text-ink-3">{m.description}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      {reason ? <p className="mt-2 text-[0.75rem] leading-snug text-[#b3adbd]">{reason}</p> : null}
    </div>
  );
}

function ScoreLine({ line }: { line: QuoteLine }) {
  return (
    <li key={`${line.key}:${line.amount}`} className="anim-flash -mx-2 flex items-baseline justify-between gap-3 rounded-[6px] px-2 py-1">
      <span className="min-w-0 text-[0.8125rem] text-[#c8c3d0]">
        {line.label}
        {line.detail && line.detail !== "Included" ? <span className="text-phosphor-dim"> · {line.detail}</span> : null}
      </span>
      <span className={cn("shrink-0 text-sm tnum", line.amount === null ? "text-ok" : line.amount < 0 ? "text-phosphor" : "text-[#ffffff]")}>
        {line.amount === null ? (line.detail === "Included" ? "Included" : "Free") : `${line.amount < 0 ? "−" : line.key === "base" ? "" : "+"}${formatMoney(Math.abs(line.amount))}`}
      </span>
    </li>
  );
}

export function Readout({
  service,
  cfg,
  sel,
  set,
  result,
  compact = false,
  bare = false,
}: {
  service: ConfiguratorService;
  cfg: { modes: MultiplierOption[] } & Record<string, unknown>;
  sel: Sel;
  set: (p: Sel) => void;
  result: ReturnType<typeof quoteService>;
  compact?: boolean;
  /** render without its own CRT frame (when already inside one) */
  bare?: boolean;
}) {
  const total = result.ok ? result.quote.total : 0;
  const shown = useAnimatedNumber(total);
  const [state, formAction] = useActionState(startBoostCheckout, null);
  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  const returnTo = `${service.path}?s=${encodeURIComponent(JSON.stringify(sel))}`;
  const rank = service.calculator === "RANK" ? (cfg as unknown as RankConfig) : null;
  const wins = service.calculator === "WINS" ? (cfg as unknown as WinsConfig) : null;
  const winsTier = wins?.tiers.find((t) => t.id === sel.tier);
  const blocked = blockedModes(service.calculator, service.config, sel);

  return (
    <div className={bare ? "" : "crt p-5 sm:p-6"}>
      {rank ? (
        <div className="mb-5 flex items-center justify-between gap-2">
          <CrestBadge
            tier={String(sel.fromTier)}
            image={rank.tiers.find((t) => t.id === sel.fromTier)?.image}
            label={rankLabel(rank, String(sel.fromTier), Number(sel.fromDivision ?? 0))}
          />
          <span className="flex shrink-0 text-p1" aria-hidden>
            <ChevronRight className="-mr-2.5 size-5 opacity-40" />
            <ChevronRight className="-mr-2.5 size-5 opacity-70" />
            <ChevronRight className="size-5" />
          </span>
          <CrestBadge tier={String(sel.toTier)} image={rank.tiers.find((t) => t.id === sel.toTier)?.image} label={rankLabel(rank, String(sel.toTier), Number(sel.toDivision ?? 0))} />
        </div>
      ) : wins && winsTier ? (
        <div className="mb-5 flex items-center justify-between gap-2">
          {winsTier.image || KNOWN_TIERS.has(winsTier.id) ? (
            <CrestBadge tier={winsTier.id} image={winsTier.image} label={winsTierLabel(wins, winsTier.id, Number(sel.division ?? 0))} />
          ) : (
            <p className="t-display text-3xl text-[#ffffff] uppercase">{winsTier.name}</p>
          )}
          <span className="flex shrink-0 text-p1" aria-hidden>
            <ChevronRight className="-mr-2.5 size-5 opacity-40" />
            <ChevronRight className="-mr-2.5 size-5 opacity-70" />
            <ChevronRight className="size-5" />
          </span>
          <p className="t-display t-phosphor text-right text-4xl leading-none uppercase">
            {Number(sel.count ?? wins.defaultCount)} {Number(sel.count ?? wins.defaultCount) === 1 ? wins.unitLabel : wins.unitLabelPlural}
          </p>
        </div>
      ) : (
        <p className="t-display mb-4 text-3xl text-[#ffffff] uppercase">{service.name}</p>
      )}

      {result.ok ? (
        <ul className="space-y-0.5 border-y border-phosphor/10 py-3" aria-label="Price breakdown">
          {result.quote.lines.map((line) => (
            <ScoreLine key={`${line.key}:${line.amount}`} line={line} />
          ))}
        </ul>
      ) : (
        <p className="rounded-[10px] border border-warn/30 bg-warn/5 px-3 py-2.5 text-sm text-warn">{result.error}</p>
      )}

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-pixel text-[0.6875rem] text-phosphor uppercase">Total</p>
          <p className="t-display t-phosphor mt-1 text-[2.9rem] leading-none tnum" aria-live="polite">
            {formatMoney(shown)}
          </p>
        </div>
        {result.ok ? (
          <div className="text-right">
            <p className="font-pixel text-[0.6875rem] text-phosphor uppercase">Estimated time</p>
            <p className="t-display mt-1 text-xl text-[#ffffff]">{formatEta(result.quote.etaHours)}</p>
          </div>
        ) : null}
      </div>

      {cfg.modes.length > 1 ? (
        <div className="mt-5">
          <ModeButtons modes={cfg.modes} value={String(sel.mode ?? cfg.modes[0].id)} onChange={(id) => set({ mode: id })} blocked={blocked} />
        </div>
      ) : null}

      <form action={formAction} className="mt-5">
        <input type="hidden" name="serviceId" value={service.id} />
        <input type="hidden" name="selection" value={JSON.stringify(sel)} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <CoinSubmit disabled={!result.ok} />
      </form>

      <p className="mt-4 flex items-start gap-2.5 text-[0.8125rem] leading-snug text-[#b3adbd]">
        <ShieldCheck className="mt-px size-4 shrink-0 text-p1" aria-hidden />
        Paid into escrow. Your booster is paid only after you confirm the job is done.
      </p>
      {!compact ? <p className="mt-2 text-[0.75rem] text-phosphor-dim">Discount codes are applied at checkout.</p> : null}
    </div>
  );
}

function CoinSubmit({ disabled, compact = false }: { disabled: boolean; compact?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className={cn("btn btn-coin gap-3", compact ? "h-12 px-4" : "btn-lg w-full px-6")}>
      <CoinSlotIcon className="size-5 shrink-0" />
      <span>{pending ? "Loading…" : compact ? "Insert coin" : "Insert coin · Buy boost"}</span>
      {compact ? null : <ChevronRight className="ml-auto size-5 shrink-0" aria-hidden />}
    </button>
  );
}

/**
 * Below lg the readout sits far down the page, so a compact total + coin slot
 * stays pinned while the visitor picks ranks and options.
 */
export function CoinBar({ service, sel, result }: { service: ConfiguratorService; sel: Sel; result: ReturnType<typeof quoteService> }) {
  const shown = useAnimatedNumber(result.ok ? result.quote.total : 0);
  const [state, formAction] = useActionState(startBoostCheckout, null);
  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);
  return (
    <form
      action={formAction}
      className="total-bar sticky bottom-3 z-30 mt-5 flex items-center justify-between gap-3 rounded-[14px] py-2 pr-3 pl-3.5 lg:hidden"
    >
      <input type="hidden" name="serviceId" value={service.id} />
      <input type="hidden" name="selection" value={JSON.stringify(sel)} />
      <input type="hidden" name="returnTo" value={`${service.path}?s=${encodeURIComponent(JSON.stringify(sel))}`} />
      <div className="flex min-w-0 items-center gap-2.5">
        <CoinStack className="size-7 shrink-0 text-p1 max-[359px]:hidden" />
        <div className="min-w-0">
          <p className="truncate font-pixel text-[0.625rem] text-phosphor uppercase">{result.ok ? `Total · ${formatEta(result.quote.etaHours)}` : "Check your options"}</p>
          <p className="t-display mt-0.5 text-[1.75rem] leading-none text-white tnum" aria-live="polite">
            {formatMoney(shown)}
          </p>
        </div>
      </div>
      <CoinSubmit disabled={!result.ok} compact />
    </form>
  );
}

function CrestBadge({ tier, label, image }: { tier: string; label: string; image?: string }) {
  const tint = tierTint(tier);
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-16 w-20 object-contain drop-shadow-[0_6px_14px_rgb(0_0_0/0.6)]" />
      ) : (
        <RankCrest tier={tier} className="h-16 w-16 drop-shadow-[0_6px_14px_rgb(0_0_0/0.6)]" />
      )}
      <span className="max-w-[9rem] truncate font-pixel text-[0.6875rem] uppercase" style={{ color: tint.h }}>
        {label}
      </span>
    </div>
  );
}

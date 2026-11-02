import { z } from "zod";

/*
  Boosting price engine. Pure functions, shared by the live configurator (client)
  and the checkout (server). The server always recomputes the quote from the
  stored service config; the client price is only a preview.
  All amounts are integer cents.
*/

export type CalculatorKind = "RANK" | "WINS" | "LEVEL" | "HOURS" | "FIXED";

// ───────────────────────── shared option schemas ─────────────────────────

const multiplierOption = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  multiplier: z.number().positive().default(1),
});

const addonSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  /** percentage added on top of the base price */
  pct: z.number().min(0).max(300).default(0),
  /** flat amount in cents */
  flat: z.number().int().min(0).default(0),
  /** shown as "Free" when pct and flat are both 0 */
  defaultOn: z.boolean().default(false),
  /** modes this add-on is available for (empty = all) */
  modes: z.array(z.string()).default([]),
});

const commonConfig = {
  servers: z.array(multiplierOption).min(1),
  queues: z.array(multiplierOption).default([]),
  modes: z.array(multiplierOption).default([]),
  addons: z.array(addonSchema).default([]),
  minPrice: z.number().int().min(0).default(500),
  /** free-text request field shown in the configurator (champions, roles, notes) */
  notesLabel: z.string().optional(),
};

// ───────────────────────── calculator configs ─────────────────────────

export const rankConfigSchema = z.object({
  ...commonConfig,
  tiers: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        /** 0 = apex tier (no divisions) */
        divisions: z.number().int().min(0).max(5),
        /** price to climb one division (or to reach the next tier from an apex tier) */
        stepPrice: z.number().int().min(0),
        /** estimated hours per division step */
        etaHours: z.number().min(0).default(8),
      }),
    )
    .min(2),
  /** names of divisions from lowest to highest, e.g. ["IV","III","II","I"] */
  divisionLabels: z.array(z.string()).min(1),
  lpBrackets: z
    .array(z.object({ id: z.string(), label: z.string(), discountPct: z.number().min(0).max(90).default(0) }))
    .default([]),
  lpGain: z.array(multiplierOption).default([]),
});

export const winsConfigSchema = z.object({
  ...commonConfig,
  unitLabel: z.string().default("win"),
  unitLabelPlural: z.string().default("wins"),
  tiers: z
    .array(z.object({ id: z.string(), name: z.string(), unitPrice: z.number().int().min(0), etaHours: z.number().min(0).default(1) }))
    .min(1),
  tierLabel: z.string().default("Current rank"),
  min: z.number().int().min(1).default(1),
  max: z.number().int().min(1).default(20),
  defaultCount: z.number().int().min(1).default(5),
});

export const levelConfigSchema = z.object({
  ...commonConfig,
  unitLabel: z.string().default("level"),
  min: z.number().int().min(0).default(1),
  max: z.number().int().min(1).default(10),
  /** price bands: each level up to and including `upTo` costs `price` */
  bands: z.array(z.object({ upTo: z.number().int(), price: z.number().int().min(0), etaHours: z.number().min(0).default(3) })).min(1),
  subjectLabel: z.string().optional(),
});

export const hoursConfigSchema = z.object({
  ...commonConfig,
  rates: z.array(z.object({ id: z.string(), label: z.string(), description: z.string().optional(), hourly: z.number().int().min(0) })).min(1),
  min: z.number().int().min(1).default(1),
  max: z.number().int().min(1).default(10),
});

export const fixedConfigSchema = z.object({
  ...commonConfig,
  packages: z
    .array(z.object({ id: z.string(), label: z.string(), description: z.string().optional(), price: z.number().int().min(0), etaHours: z.number().min(0).default(24) }))
    .min(1),
});

export type RankConfig = z.infer<typeof rankConfigSchema>;
export type WinsConfig = z.infer<typeof winsConfigSchema>;
export type LevelConfig = z.infer<typeof levelConfigSchema>;
export type HoursConfig = z.infer<typeof hoursConfigSchema>;
export type FixedConfig = z.infer<typeof fixedConfigSchema>;
export type AnyConfig = RankConfig | WinsConfig | LevelConfig | HoursConfig | FixedConfig;
export type Addon = z.infer<typeof addonSchema>;
export type MultiplierOption = z.infer<typeof multiplierOption>;

export const configSchemas = {
  RANK: rankConfigSchema,
  WINS: winsConfigSchema,
  LEVEL: levelConfigSchema,
  HOURS: hoursConfigSchema,
  FIXED: fixedConfigSchema,
} as const;

export function parseConfig(kind: CalculatorKind, raw: unknown) {
  return configSchemas[kind].safeParse(raw);
}

// ───────────────────────── selections ─────────────────────────

const commonSelection = {
  server: z.string().min(1),
  queue: z.string().optional(),
  mode: z.string().optional(),
  addons: z.array(z.string()).max(20).default([]),
  notes: z.string().max(400).optional(),
};

export const selectionSchemas = {
  RANK: z.object({
    ...commonSelection,
    fromTier: z.string(),
    fromDivision: z.number().int().min(0).max(4).default(0),
    lp: z.string().optional(),
    lpGain: z.string().optional(),
    toTier: z.string(),
    toDivision: z.number().int().min(0).max(4).default(0),
  }),
  WINS: z.object({ ...commonSelection, tier: z.string(), count: z.number().int().min(1).max(200) }),
  LEVEL: z.object({ ...commonSelection, from: z.number().int().min(0).max(1000), to: z.number().int().min(1).max(1000) }),
  HOURS: z.object({ ...commonSelection, rate: z.string(), hours: z.number().int().min(1).max(100) }),
  FIXED: z.object({ ...commonSelection, package: z.string() }),
} as const;

export type RankSelection = z.infer<(typeof selectionSchemas)["RANK"]>;
export type WinsSelection = z.infer<(typeof selectionSchemas)["WINS"]>;
export type LevelSelection = z.infer<(typeof selectionSchemas)["LEVEL"]>;
export type HoursSelection = z.infer<(typeof selectionSchemas)["HOURS"]>;
export type FixedSelection = z.infer<(typeof selectionSchemas)["FIXED"]>;
export type AnySelection = RankSelection | WinsSelection | LevelSelection | HoursSelection | FixedSelection;

// ───────────────────────── quote ─────────────────────────

export type QuoteLine = {
  /** stable key for animation */
  key: string;
  label: string;
  /** cents; negative for discounts. null = included / free */
  amount: number | null;
  detail?: string;
};

export type Quote = {
  lines: QuoteLine[];
  total: number;
  etaHours: number;
  /** one-line human summary, e.g. "Silver I → Gold IV · EUW · Solo/Duo" */
  summary: string;
  /** short title for the order, e.g. "Rank Boost: Silver I → Gold IV" */
  title: string;
  /** resolved, display-ready facts saved with the order */
  facts: { label: string; value: string }[];
};

export type QuoteResult = { ok: true; quote: Quote } | { ok: false; error: string };

const pick = <T extends { id: string }>(list: T[], id: string | undefined): T | undefined =>
  id ? list.find((x) => x.id === id) : undefined;

/** Applies server/queue/mode multipliers and add-ons on top of a base amount. */
function applyModifiers(
  base: number,
  cfg: { servers: MultiplierOption[]; queues: MultiplierOption[]; modes: MultiplierOption[]; addons: Addon[]; minPrice: number },
  sel: { server: string; queue?: string; mode?: string; addons: string[] },
  lines: QuoteLine[],
  facts: { label: string; value: string }[],
): { ok: true; total: number; addonIds: string[] } | { ok: false; error: string } {
  let running = base;

  const server = pick(cfg.servers, sel.server);
  if (!server) return { ok: false, error: "Choose a server." };
  facts.push({ label: "Server", value: server.label });
  if (server.multiplier !== 1) {
    const delta = Math.round(running * (server.multiplier - 1));
    lines.push({ key: "server", label: `Server · ${server.label}`, amount: delta });
    running += delta;
  }

  if (cfg.queues.length) {
    const queue = pick(cfg.queues, sel.queue) ?? cfg.queues[0];
    facts.push({ label: "Queue", value: queue.label });
    if (queue.multiplier !== 1) {
      const delta = Math.round(running * (queue.multiplier - 1));
      lines.push({ key: "queue", label: `Queue · ${queue.label}`, amount: delta });
      running += delta;
    }
  }

  let modeId: string | undefined;
  if (cfg.modes.length) {
    const mode = pick(cfg.modes, sel.mode) ?? cfg.modes[0];
    modeId = mode.id;
    facts.push({ label: "Play mode", value: mode.label });
    if (mode.multiplier !== 1) {
      const delta = Math.round(running * (mode.multiplier - 1));
      lines.push({ key: "mode", label: `${mode.label} mode`, amount: delta });
      running += delta;
    }
  }

  // Add-ons are percentages of the price after server/queue/mode, so they stay proportional.
  const chosen = new Set(sel.addons);
  const addonIds: string[] = [];
  const subtotalForAddons = running;
  for (const addon of cfg.addons) {
    if (!chosen.has(addon.id)) continue;
    if (addon.modes.length && modeId && !addon.modes.includes(modeId)) continue;
    addonIds.push(addon.id);
    const amount = Math.round((subtotalForAddons * addon.pct) / 100) + addon.flat;
    lines.push({
      key: `addon-${addon.id}`,
      label: addon.label,
      amount: amount === 0 ? null : amount,
      detail: addon.pct ? `+${addon.pct}%` : undefined,
    });
    running += amount;
  }
  if (addonIds.length) {
    facts.push({
      label: "Extras",
      value: cfg.addons.filter((a) => addonIds.includes(a.id)).map((a) => a.label).join(", "),
    });
  }

  if (running < cfg.minPrice) {
    lines.push({ key: "minimum", label: "Minimum order", amount: cfg.minPrice - running });
    running = cfg.minPrice;
  }

  return { ok: true, total: running, addonIds };
}

// ── RANK ──

export type LadderPoint = { tierIndex: number; division: number };

/** Linear position of a tier/division on the ladder (0 = lowest). */
export function ladderIndex(cfg: RankConfig, tierId: string, division: number): number {
  let idx = 0;
  for (const tier of cfg.tiers) {
    const span = Math.max(1, tier.divisions);
    if (tier.id === tierId) {
      if (tier.divisions === 0) return idx;
      return idx + Math.min(Math.max(division, 0), tier.divisions - 1);
    }
    idx += span;
  }
  return -1;
}

/** Inverse of ladderIndex. */
export function ladderPoint(cfg: RankConfig, index: number): { tier: RankConfig["tiers"][number]; division: number } | null {
  let idx = 0;
  for (const tier of cfg.tiers) {
    const span = Math.max(1, tier.divisions);
    if (index < idx + span) return { tier, division: tier.divisions === 0 ? 0 : index - idx };
    idx += span;
  }
  return null;
}

export function ladderLength(cfg: RankConfig) {
  return cfg.tiers.reduce((n, t) => n + Math.max(1, t.divisions), 0);
}

export function rankLabel(cfg: RankConfig, tierId: string, division: number) {
  const tier = cfg.tiers.find((t) => t.id === tierId);
  if (!tier) return tierId;
  if (tier.divisions === 0) return tier.name;
  const labels = cfg.divisionLabels.slice(-tier.divisions);
  return `${tier.name} ${labels[Math.min(division, labels.length - 1)] ?? ""}`.trim();
}

function quoteRank(cfg: RankConfig, sel: RankSelection, serviceName: string): QuoteResult {
  const from = ladderIndex(cfg, sel.fromTier, sel.fromDivision);
  const to = ladderIndex(cfg, sel.toTier, sel.toDivision);
  if (from < 0 || to < 0) return { ok: false, error: "Pick your current and desired rank." };
  if (to <= from) return { ok: false, error: "Your desired rank must be higher than your current rank." };

  const lines: QuoteLine[] = [];
  const facts: { label: string; value: string }[] = [];
  const fromLabel = rankLabel(cfg, sel.fromTier, sel.fromDivision);
  const toLabel = rankLabel(cfg, sel.toTier, sel.toDivision);
  facts.push({ label: "Current rank", value: fromLabel }, { label: "Desired rank", value: toLabel });

  let base = 0;
  let eta = 0;
  let firstStep = 0;
  for (let i = from; i < to; i++) {
    const point = ladderPoint(cfg, i);
    if (!point) break;
    if (i === from) firstStep = point.tier.stepPrice;
    base += point.tier.stepPrice;
    eta += point.tier.etaHours;
  }
  const steps = to - from;
  lines.push({
    key: "base",
    label: `${fromLabel} → ${toLabel}`,
    amount: base,
    detail: `${steps} ${steps === 1 ? "division" : "divisions"}`,
  });

  let running = base;
  const bracket = pick(cfg.lpBrackets, sel.lp);
  if (bracket) {
    facts.push({ label: "Current LP", value: bracket.label });
    if (bracket.discountPct > 0) {
      const delta = -Math.round((firstStep * bracket.discountPct) / 100);
      lines.push({ key: "lp", label: `Current LP · ${bracket.label}`, amount: delta });
      running += delta;
    }
  }
  const gain = pick(cfg.lpGain, sel.lpGain);
  if (gain) {
    facts.push({ label: "LP per win", value: gain.label });
    if (gain.multiplier !== 1) {
      const delta = Math.round(running * (gain.multiplier - 1));
      lines.push({ key: "lpgain", label: `LP gain · ${gain.label}`, amount: delta });
      running += delta;
      eta *= gain.multiplier;
    }
  }

  const mod = applyModifiers(running, cfg, sel, lines, facts);
  if (!mod.ok) return mod;
  if (sel.notes) facts.push({ label: cfg.notesLabel ?? "Notes", value: sel.notes });

  const priority = mod.addonIds.includes("priority");
  const queue = pick(cfg.queues, sel.queue) ?? cfg.queues[0];
  return {
    ok: true,
    quote: {
      lines,
      total: mod.total,
      etaHours: Math.max(2, Math.round(eta * (priority ? 0.7 : 1))),
      summary: [`${fromLabel} → ${toLabel}`, pick(cfg.servers, sel.server)?.label, queue?.label].filter(Boolean).join(" · "),
      title: `${serviceName}: ${fromLabel} → ${toLabel}`,
      facts,
    },
  };
}

// ── WINS ──

function quoteWins(cfg: WinsConfig, sel: WinsSelection, serviceName: string): QuoteResult {
  const tier = pick(cfg.tiers, sel.tier);
  if (!tier) return { ok: false, error: `Choose your ${cfg.tierLabel.toLowerCase()}.` };
  if (sel.count < cfg.min || sel.count > cfg.max) return { ok: false, error: `Choose between ${cfg.min} and ${cfg.max} ${cfg.unitLabelPlural}.` };

  const lines: QuoteLine[] = [];
  const facts = [
    { label: cfg.tierLabel, value: tier.name },
    { label: cfg.unitLabelPlural[0].toUpperCase() + cfg.unitLabelPlural.slice(1), value: String(sel.count) },
  ];
  const base = tier.unitPrice * sel.count;
  const unit = sel.count === 1 ? cfg.unitLabel : cfg.unitLabelPlural;
  lines.push({ key: "base", label: `${sel.count} ${unit} · ${tier.name}`, amount: base });

  const mod = applyModifiers(base, cfg, sel, lines, facts);
  if (!mod.ok) return mod;
  if (sel.notes) facts.push({ label: cfg.notesLabel ?? "Notes", value: sel.notes });
  const priority = mod.addonIds.includes("priority");
  return {
    ok: true,
    quote: {
      lines,
      total: mod.total,
      etaHours: Math.max(1, Math.round(tier.etaHours * sel.count * (priority ? 0.7 : 1))),
      summary: [`${sel.count} ${unit}`, tier.name, pick(cfg.servers, sel.server)?.label].filter(Boolean).join(" · "),
      title: `${serviceName}: ${sel.count} ${unit} (${tier.name})`,
      facts,
    },
  };
}

// ── LEVEL ──

function quoteLevel(cfg: LevelConfig, sel: LevelSelection, serviceName: string): QuoteResult {
  if (sel.from < cfg.min || sel.to > cfg.max || sel.to <= sel.from) {
    return { ok: false, error: `Choose a ${cfg.unitLabel} range between ${cfg.min} and ${cfg.max}.` };
  }
  if (cfg.subjectLabel && !sel.notes?.trim()) {
    return { ok: false, error: `Enter the ${cfg.subjectLabel.toLowerCase()}.` };
  }
  const bands = [...cfg.bands].sort((a, b) => a.upTo - b.upTo);
  let base = 0;
  let eta = 0;
  for (let level = sel.from + 1; level <= sel.to; level++) {
    const band = bands.find((b) => level <= b.upTo) ?? bands[bands.length - 1];
    base += band.price;
    eta += band.etaHours;
  }
  const label = cfg.unitLabel[0].toUpperCase() + cfg.unitLabel.slice(1);
  const lines: QuoteLine[] = [{ key: "base", label: `${label} ${sel.from} → ${sel.to}`, amount: base }];
  const facts = [{ label: `${label}s`, value: `${sel.from} → ${sel.to}` }];
  const mod = applyModifiers(base, cfg, sel, lines, facts);
  if (!mod.ok) return mod;
  if (sel.notes) facts.push({ label: cfg.notesLabel ?? cfg.subjectLabel ?? "Notes", value: sel.notes });
  return {
    ok: true,
    quote: {
      lines,
      total: mod.total,
      etaHours: Math.max(1, Math.round(eta * (mod.addonIds.includes("priority") ? 0.7 : 1))),
      summary: [`${label} ${sel.from} → ${sel.to}`, sel.notes, pick(cfg.servers, sel.server)?.label].filter(Boolean).join(" · "),
      title: `${serviceName}: ${label} ${sel.from} → ${sel.to}`,
      facts,
    },
  };
}

// ── HOURS ──

function quoteHours(cfg: HoursConfig, sel: HoursSelection, serviceName: string): QuoteResult {
  const rate = pick(cfg.rates, sel.rate);
  if (!rate) return { ok: false, error: "Choose a coach level." };
  if (sel.hours < cfg.min || sel.hours > cfg.max) return { ok: false, error: `Choose between ${cfg.min} and ${cfg.max} hours.` };
  const base = rate.hourly * sel.hours;
  const lines: QuoteLine[] = [{ key: "base", label: `${sel.hours} h · ${rate.label}`, amount: base }];
  const facts = [
    { label: "Coach", value: rate.label },
    { label: "Hours", value: String(sel.hours) },
  ];
  const mod = applyModifiers(base, cfg, sel, lines, facts);
  if (!mod.ok) return mod;
  if (sel.notes) facts.push({ label: cfg.notesLabel ?? "Notes", value: sel.notes });
  return {
    ok: true,
    quote: {
      lines,
      total: mod.total,
      etaHours: 24,
      summary: [`${sel.hours} h`, rate.label, pick(cfg.servers, sel.server)?.label].filter(Boolean).join(" · "),
      title: `${serviceName}: ${sel.hours} h with ${rate.label}`,
      facts,
    },
  };
}

// ── FIXED ──

function quoteFixed(cfg: FixedConfig, sel: FixedSelection, serviceName: string): QuoteResult {
  const pkg = pick(cfg.packages, sel.package);
  if (!pkg) return { ok: false, error: "Choose a package." };
  const lines: QuoteLine[] = [{ key: "base", label: pkg.label, amount: pkg.price }];
  const facts = [{ label: "Package", value: pkg.label }];
  const mod = applyModifiers(pkg.price, cfg, sel, lines, facts);
  if (!mod.ok) return mod;
  if (sel.notes) facts.push({ label: cfg.notesLabel ?? "Notes", value: sel.notes });
  return {
    ok: true,
    quote: {
      lines,
      total: mod.total,
      etaHours: pkg.etaHours,
      summary: [pkg.label, pick(cfg.servers, sel.server)?.label].filter(Boolean).join(" · "),
      title: `${serviceName}: ${pkg.label}`,
      facts,
    },
  };
}

/** Validates config + selection and returns an itemized quote. */
export function quoteService(
  service: { calculator: CalculatorKind; config: unknown; name: string },
  rawSelection: unknown,
): QuoteResult {
  const cfg = parseConfig(service.calculator, service.config);
  if (!cfg.success) return { ok: false, error: "This service is misconfigured. Please contact support." };
  const sel = selectionSchemas[service.calculator].safeParse(rawSelection);
  if (!sel.success) return { ok: false, error: "Some options are missing or invalid." };

  switch (service.calculator) {
    case "RANK":
      return quoteRank(cfg.data as RankConfig, sel.data as RankSelection, service.name);
    case "WINS":
      return quoteWins(cfg.data as WinsConfig, sel.data as WinsSelection, service.name);
    case "LEVEL":
      return quoteLevel(cfg.data as LevelConfig, sel.data as LevelSelection, service.name);
    case "HOURS":
      return quoteHours(cfg.data as HoursConfig, sel.data as HoursSelection, service.name);
    case "FIXED":
      return quoteFixed(cfg.data as FixedConfig, sel.data as FixedSelection, service.name);
  }
}

/** A sensible starting selection for a service, used by the configurator and "from" prices. */
export function defaultSelection(kind: CalculatorKind, rawConfig: unknown): AnySelection | null {
  const parsed = parseConfig(kind, rawConfig);
  if (!parsed.success) return null;
  const c = parsed.data;
  const common = {
    server: c.servers[0]?.id ?? "",
    queue: c.queues[0]?.id,
    mode: c.modes[0]?.id,
    addons: c.addons.filter((a) => a.defaultOn).map((a) => a.id),
  };
  switch (kind) {
    case "RANK": {
      const r = c as RankConfig;
      const silver = r.tiers.findIndex((t) => t.id === "silver");
      const fromTier = r.tiers[Math.max(0, silver)] ?? r.tiers[0];
      const toTier = r.tiers[Math.max(0, silver) + 1] ?? r.tiers[1];
      return {
        ...common,
        fromTier: fromTier.id,
        fromDivision: Math.max(0, fromTier.divisions - 1),
        lp: r.lpBrackets[0]?.id,
        lpGain: r.lpGain[0]?.id,
        toTier: toTier.id,
        toDivision: 0,
      } satisfies RankSelection;
    }
    case "WINS": {
      const w = c as WinsConfig;
      return { ...common, tier: w.tiers[Math.min(2, w.tiers.length - 1)].id, count: w.defaultCount } satisfies WinsSelection;
    }
    case "LEVEL": {
      const l = c as LevelConfig;
      return { ...common, from: l.min, to: Math.min(l.max, l.min + 4) } satisfies LevelSelection;
    }
    case "HOURS": {
      const h = c as HoursConfig;
      return { ...common, rate: h.rates[0].id, hours: h.min } satisfies HoursSelection;
    }
    case "FIXED": {
      const f = c as FixedConfig;
      return { ...common, package: f.packages[0].id } satisfies FixedSelection;
    }
  }
}

/** Cheapest realistic entry price, used for "from €x" labels on cards. */
export function startingPrice(kind: CalculatorKind, rawConfig: unknown): number | null {
  const parsed = parseConfig(kind, rawConfig);
  if (!parsed.success) return null;
  const c = parsed.data;
  switch (kind) {
    case "RANK": {
      const r = c as RankConfig;
      return Math.max(r.minPrice, Math.min(...r.tiers.filter((t) => t.stepPrice > 0).map((t) => t.stepPrice)));
    }
    case "WINS":
      return Math.max(c.minPrice, Math.min(...(c as WinsConfig).tiers.map((t) => t.unitPrice)));
    case "LEVEL":
      return Math.max(c.minPrice, Math.min(...(c as LevelConfig).bands.map((b) => b.price)));
    case "HOURS":
      return Math.max(c.minPrice, Math.min(...(c as HoursConfig).rates.map((r) => r.hourly)));
    case "FIXED":
      return Math.max(c.minPrice, Math.min(...(c as FixedConfig).packages.map((p) => p.price)));
  }
}

export function formatEta(hours: number): string {
  if (hours < 24) return `~${Math.max(1, Math.round(hours))} h`;
  const days = Math.round(hours / 24);
  return `~${days} ${days === 1 ? "day" : "days"}`;
}

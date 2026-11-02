"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ladderIndex, ladderLength, ladderPoint, parseConfig, quoteService, type RankConfig } from "@/lib/boosting/engine";
import { CoinBar, DivisionPicker, Readout, Segmented, Select, TierPicker, type ConfiguratorService } from "./configurator";

type Sel = Record<string, unknown>;

/**
 * The home page attract screen: the working LoL rank-boost configurator inside
 * one CRT. Rank select on the left, the score readout and coin slot on the right.
 */
export function HeroConsole({ service, initial, title, intro }: { service: ConfiguratorService; initial: Sel; title: string; intro: string }) {
  const parsed = useMemo(() => parseConfig("RANK", service.config), [service.config]);
  const [sel, setSel] = useState<Sel>(initial);
  const result = useMemo(() => quoteService(service, sel), [service, sel]);
  if (!parsed.success) return null;
  const cfg = parsed.data as RankConfig;
  const set = (patch: Sel) => setSel((s) => ({ ...s, ...patch }));

  const fromTier = String(sel.fromTier);
  const fromDivision = Number(sel.fromDivision ?? 0);
  const toTier = String(sel.toTier);
  const toDivision = Number(sel.toDivision ?? 0);
  const fromIdx = ladderIndex(cfg, fromTier, fromDivision);
  const last = ladderLength(cfg) - 1;

  const setFrom = (tier: string, division: number) => {
    const idx = ladderIndex(cfg, tier, division);
    const patch: Sel = { fromTier: tier, fromDivision: division };
    if (ladderIndex(cfg, toTier, toDivision) <= idx) {
      const next = ladderPoint(cfg, Math.min(idx + 1, last));
      if (next) Object.assign(patch, { toTier: next.tier.id, toDivision: next.division });
    }
    set(patch);
  };
  const tierMax = (id: string) => {
    const t = cfg.tiers.find((x) => x.id === id);
    return ladderIndex(cfg, id, Math.max(0, (t?.divisions ?? 1) - 1));
  };
  const fromT = cfg.tiers.find((t) => t.id === fromTier);
  const toT = cfg.tiers.find((t) => t.id === toTier);
  const moreHref = `${service.path}?s=${encodeURIComponent(JSON.stringify(sel))}`;

  return (
    <div className="crt">
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 p-5 sm:p-6 lg:border-r lg:border-phosphor/10">
          <h1 className="t-display t-extrude text-[2.6rem] text-ink uppercase sm:text-[3.3rem] xl:text-[3.7rem]">{title}</h1>
          <p className="mt-3 max-w-[66ch] text-[0.98rem] leading-relaxed text-[#b9dcd5]">{intro}</p>

          <div className="mt-5 space-y-5">
            <div>
              <p className="mb-2.5 flex items-baseline justify-between font-pixel text-[0.6875rem] text-phosphor-dim uppercase">
                <span>Your rank</span>
              </p>
              <TierPicker
                tiers={cfg.tiers}
                value={fromTier}
                tag="P1"
                cursor="#ff2e88"
                isDisabled={(id) => ladderIndex(cfg, id, 0) >= last}
                onChange={(id) => {
                  const t = cfg.tiers.find((x) => x.id === id)!;
                  setFrom(id, Math.min(fromDivision, Math.max(0, t.divisions - 1)));
                }}
              />
              {fromT && fromT.divisions > 0 ? (
                <DivisionPicker
                  count={fromT.divisions}
                  labels={cfg.divisionLabels}
                  value={fromDivision}
                  onChange={(d) => setFrom(fromTier, d)}
                  isDisabled={(d) => ladderIndex(cfg, fromTier, d) >= last}
                />
              ) : null}
            </div>
            <div>
              <p className="mb-2.5 font-pixel text-[0.6875rem] text-phosphor-dim uppercase">Goal</p>
              <TierPicker
                tiers={cfg.tiers}
                value={toTier}
                tag="GOAL"
                cursor="#2f6bff"
                isDisabled={(id) => tierMax(id) <= fromIdx}
                onChange={(id) => {
                  const t = cfg.tiers.find((x) => x.id === id)!;
                  let d = Math.min(toDivision, Math.max(0, t.divisions - 1));
                  while (t.divisions > 0 && ladderIndex(cfg, id, d) <= fromIdx && d < t.divisions - 1) d++;
                  set({ toTier: id, toDivision: d });
                }}
              />
              {toT && toT.divisions > 0 ? (
                <DivisionPicker
                  count={toT.divisions}
                  labels={cfg.divisionLabels}
                  value={toDivision}
                  onChange={(d) => set({ toDivision: d })}
                  isDisabled={(d) => ladderIndex(cfg, toTier, d) <= fromIdx}
                />
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Server" value={sel.server as string} options={cfg.servers} onChange={(v) => set({ server: v })} />
              {cfg.queues.length > 1 ? (
                <Segmented label="Queue" value={(sel.queue as string) ?? cfg.queues[0].id} options={cfg.queues} onChange={(v) => set({ queue: v })} />
              ) : null}
            </div>
          </div>
          <CoinBar service={service} sel={sel} result={result} />
        </div>

        <div className="min-w-0 border-t border-phosphor/10 bg-black/25 p-5 sm:p-6 lg:border-t-0">
          <Readout service={service} cfg={cfg} sel={sel} set={set} result={result} compact bare />
          <Link href={moreHref} className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] text-phosphor underline-offset-4 hover:underline">
            LP, extras and champion picks <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ladderIndex, ladderLength, ladderPoint, parseConfig, quoteService, type RankConfig } from "@/lib/boosting/engine";
import { formatMoney } from "@/lib/utils";
import { LogoMark } from "../brand";
import { CoinSlotIcon, CoinStack } from "../marks";
import { DivisionPicker, ModeGuard, TierPicker, type ConfiguratorService } from "./configurator";
import { useAnimatedNumber } from "./use-animated-number";

type Sel = Record<string, unknown>;

/**
 * The home page rank board: pick your rank and your goal, read the estimate,
 * and carry the selection into the full rank-boost page (server, queue, extras).
 */
export function RankBoard({ service, initial }: { service: ConfiguratorService; initial: Sel }) {
  const parsed = useMemo(() => parseConfig("RANK", service.config), [service.config]);
  const [sel, setSel] = useState<Sel>(initial);
  const result = useMemo(() => quoteService(service, sel), [service, sel]);
  const shown = useAnimatedNumber(result.ok ? result.quote.total : 0);
  const fromId = useId();
  const toId = useId();
  if (!parsed.success) return null;
  const cfg = parsed.data as RankConfig;
  const set = (patch: Sel) => setSel((s) => ({ ...s, ...patch }));

  const fromTier = String(sel.fromTier);
  const fromDivision = Number(sel.fromDivision ?? 0);
  const toTier = String(sel.toTier);
  const toDivision = Number(sel.toDivision ?? 0);
  const fromIdx = ladderIndex(cfg, fromTier, fromDivision);
  const last = ladderLength(cfg) - 1;

  // Moving the start past the goal pushes the goal one step above it.
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
  const next = `${service.path}?s=${encodeURIComponent(JSON.stringify(sel))}`;

  return (
    <div>
      <ModeGuard calculator="RANK" config={service.config} modes={cfg.modes} sel={sel} set={set} />
      <div className="crt grid grid-cols-[minmax(0,1fr)] lg:grid-cols-2">
        <div className="min-w-0 p-4 sm:p-5">
          <h2 id={fromId} className="slash-label mb-3 text-[1.0625rem]">
            Your rank
          </h2>
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
          {fromT && fromT.divisions > 0 ? (
            <DivisionPicker
              label="Your rank"
              count={fromT.divisions}
              labels={cfg.divisionLabels}
              value={fromDivision}
              onChange={(d) => setFrom(fromTier, d)}
              isDisabled={(d) => ladderIndex(cfg, fromTier, d) >= last}
            />
          ) : (
            <p className="mt-4 text-sm text-ink-3">Ranked by LP; enter yours on the next screen.</p>
          )}
        </div>
        <div className="min-w-0 border-t border-white/[0.06] p-4 sm:p-5 lg:border-t-0 lg:border-l">
          <h2 id={toId} className="slash-label mb-3 text-[1.0625rem]">
            Goal
          </h2>
          <TierPicker
            tiers={cfg.tiers}
            value={toTier}
            labelledBy={toId}
            tag="GOAL"
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
              label="Goal"
              count={toT.divisions}
              labels={cfg.divisionLabels}
              value={toDivision}
              onChange={(d) => set({ toDivision: d })}
              isDisabled={(d) => ladderIndex(cfg, toTier, d) <= fromIdx}
            />
          ) : (
            <p className="mt-4 text-sm text-ink-3">No divisions at this tier: reaching it is the goal.</p>
          )}
        </div>
      </div>

      <div className="total-bar relative mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 overflow-hidden rounded-[18px] p-4 sm:flex-nowrap sm:px-6">
        <LogoMark flat className="pointer-events-none absolute top-1/2 left-1/2 h-24 -translate-x-1/2 -translate-y-1/2 text-p1 opacity-[0.07] max-sm:hidden" />
        <div className="relative flex min-w-0 items-center gap-4">
          <CoinStack className="size-9 shrink-0 text-p1 drop-shadow-[0_0_10px_rgb(255_46_136/0.55)]" />
          <div className="min-w-0">
            <p className="font-pixel text-[0.75rem] text-phosphor uppercase">{result.ok ? "Total (est.)" : "Check your ranks"}</p>
            <p className="t-display mt-1 text-[2.4rem] leading-none text-white tnum" aria-live="polite">
              {formatMoney(shown)}
            </p>
          </div>
        </div>
        <Link
          href={next}
          aria-disabled={!result.ok}
          className="btn btn-coin btn-lg relative w-full gap-3 px-6 sm:w-auto sm:min-w-[250px] aria-disabled:pointer-events-none"
        >
          <CoinSlotIcon className="size-5 shrink-0" />
          <span>Insert coin</span>
          <ChevronRight className="ml-auto size-5 shrink-0" aria-hidden />
        </Link>
      </div>
      <p className="mt-3 text-[0.8125rem] text-ink-3">
        Estimate for {cfg.servers.find((s) => s.id === sel.server)?.label ?? "your server"}. Pick your server, queue, LP and extras on the next screen.
      </p>
    </div>
  );
}

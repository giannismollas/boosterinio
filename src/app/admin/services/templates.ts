import { exampleFixed, lolCoaching, lolMastery, lolRankBoost, lolWinBoost } from "@/lib/boosting/presets";

/** Starting JSON for each calculator in the service editor. */
export function serviceTemplates() {
  const pretty = (v: unknown) => JSON.stringify(v, null, 2);
  return {
    RANK: pretty(lolRankBoost),
    WINS: pretty(lolWinBoost),
    LEVEL: pretty(lolMastery),
    HOURS: pretty(lolCoaching),
    FIXED: pretty(exampleFixed),
  } as const;
}

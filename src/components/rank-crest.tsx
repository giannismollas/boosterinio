import { PixelArt } from "./pixel";

/*
  Boosterinio's own pixel rank crests (not publisher artwork). One shield
  silhouette, re-colored per tier; Platinum+ grow wings, Master+ wear a crown.
*/

const CREST = [
  "....c..cc..c....",
  "....cccccccc....",
  "...oooooooooo...",
  "..ohhhfffffffo..",
  "w.ohhfffffffso.w",
  "wwohffffffffsoww",
  "wwohffggggffsoww",
  ".wohfgGGGgffsow.",
  "..ohfgGGGgffso..",
  "..ohffggggffso..",
  "...ohfffffsso...",
  "....ohffffso....",
  ".....ohffso.....",
  "......ohso......",
  ".......oo.......",
] as const;

type Tint = { f: string; h: string; s: string; g: string; G: string; wings?: boolean; crown?: boolean };

const TIERS: Record<string, Tint> = {
  unranked: { f: "#403d39", h: "#5e5a55", s: "#2f2d2a", g: "#918c85", G: "#5e5a55" },
  iron: { f: "#6b6670", h: "#8f8a94", s: "#4a4650", g: "#c9c3cd", G: "#7d7882" },
  bronze: { f: "#a0663e", h: "#c58a5c", s: "#6f4426", g: "#f0c49b", G: "#b07a52" },
  silver: { f: "#9aa7b4", h: "#c9d3dc", s: "#6b7785", g: "#ffffff", G: "#b0bcc8" },
  gold: { f: "#d9a93a", h: "#f5d46e", s: "#9c7420", g: "#fff1b0", G: "#e3b84a" },
  platinum: { f: "#3fb8a9", h: "#7fe3d6", s: "#217a70", g: "#d4fff9", G: "#5fd1c3", wings: true },
  emerald: { f: "#1f9e5a", h: "#4fd18a", s: "#10663a", g: "#b9ffd8", G: "#2fbf72", wings: true },
  diamond: { f: "#5a7cf0", h: "#8fa8ff", s: "#3550b8", g: "#e3e9ff", G: "#7d97ff", wings: true },
  master: { f: "#9b4fd9", h: "#c48af2", s: "#6a2c9e", g: "#f1dcff", G: "#b46ef0", wings: true, crown: true },
  grandmaster: { f: "#d93a4a", h: "#f57582", s: "#9c1f2c", g: "#ffd6da", G: "#e85462", wings: true, crown: true },
  challenger: { f: "#e9c35b", h: "#fff0b8", s: "#a8862a", g: "#c9f4ff", G: "#4fc3f7", wings: true, crown: true },
};

const FALLBACK: Tint[] = [TIERS.iron, TIERS.bronze, TIERS.silver, TIERS.gold, TIERS.platinum, TIERS.emerald, TIERS.diamond, TIERS.master, TIERS.grandmaster, TIERS.challenger];

export function tierTint(id: string, index = 0): Tint {
  const key = id.toLowerCase().replace(/[^a-z]/g, "");
  return TIERS[key] ?? FALLBACK[Math.min(index, FALLBACK.length - 1)];
}

export function RankCrest({
  tier,
  index = 0,
  className,
  title,
}: {
  tier: string;
  index?: number;
  className?: string;
  title?: string;
}) {
  const t = tierTint(tier, index);
  const palette: Record<string, string> = {
    o: "#0b0a09",
    f: t.f,
    h: t.h,
    s: t.s,
    g: t.g,
    G: t.G,
  };
  if (t.wings) palette.w = t.h;
  if (t.crown) palette.c = "#ffe27a";
  return <PixelArt map={CREST} palette={palette} className={className} title={title} />;
}

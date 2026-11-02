/*
  Crawls every game hub, category tab and boosting page on a running dev server
  and reports non-200 pages, missing labels and broken values.
    npx tsx scripts/check-pages.ts
*/
import "dotenv/config";
import { CATEGORIES, categoryLabel } from "../src/lib/catalog";
import { GAMES } from "../src/lib/games-data";
import { LOL_SERVICES } from "../src/lib/boosting/presets";

const BASE = "http://localhost:3000";
const problems: string[] = [];
let checked = 0;

async function check(path: string, expect: string[] = []) {
  const res = await fetch(BASE + path, { redirect: "manual" });
  const html = await res.text();
  checked++;
  if (res.status !== 200) return problems.push(`${res.status} ${path}`);
  const text = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
  for (const bad of [" undefined ", " NaN", "[object Object]", "Invalid Date"]) if (text.includes(bad)) problems.push(`"${bad.trim()}" on ${path}`);
  for (const e of expect) if (!html.includes(e)) problems.push(`missing "${e}" on ${path}`);
}

(async () => {
  for (const g of GAMES) {
    const tabs = g.categories.map((c) => categoryLabel(c, { currencyName: g.currencyName ?? null, topupName: g.topupName ?? null }));
    await check(`/${g.slug}`, [g.name, `/images/games/${g.slug}.webp`, ...tabs.map((t) => t.replace(/&/g, "&amp;"))]);
    for (const c of g.categories) await check(`/${g.slug}/${CATEGORIES[c].slug}`);
    if (g.boosting) {
      await check(`/${g.slug}/boosting`);
      for (const s of LOL_SERVICES) await check(`/${g.slug}/boosting/${s.slug}`, [s.name]);
    }
  }
  // Categories a game doesn't have must 404, and unknown games too.
  for (const p of ["/fortnite/currency", "/league-of-legends/currency", "/no-such-game"]) {
    const res = await fetch(BASE + p, { redirect: "manual" });
    checked++;
    if (res.status !== 404) problems.push(`expected 404, got ${res.status} for ${p}`);
  }
  for (const p of ["/fortnite/boosting/rank-boost"]) {
    const res = await fetch(BASE + p, { redirect: "manual" });
    checked++;
    if (res.status !== 404) problems.push(`expected 404 (no boosting), got ${res.status} for ${p}`);
  }
  console.log(`checked ${checked} URLs`);
  console.log(problems.length ? problems.join("\n") : "NO PROBLEMS");
})();

import type { Addon, FixedConfig, HoursConfig, LevelConfig, RankConfig, WinsConfig } from "./engine";

/*
  Launch configuration for League of Legends boosting. These are seeded into the
  database; after that, staff edit prices from Admin → Services without code changes.
  Amounts are EUR cents.
*/

export const LOL_SERVERS = [
  { id: "euw", label: "Europe West", multiplier: 1 },
  { id: "eune", label: "Europe Nordic & East", multiplier: 0.95 },
  { id: "na", label: "North America", multiplier: 1 },
  { id: "oce", label: "Oceania", multiplier: 1.1 },
  { id: "br", label: "Brazil", multiplier: 0.95 },
  { id: "lan", label: "Latin America North", multiplier: 0.95 },
  { id: "las", label: "Latin America South", multiplier: 0.95 },
  { id: "tr", label: "Turkey", multiplier: 0.9 },
  { id: "ru", label: "Russia", multiplier: 0.9 },
  { id: "me", label: "Middle East", multiplier: 1 },
  { id: "jp", label: "Japan", multiplier: 1.15 },
  { id: "sea", label: "SEA (SG, PH, TH, TW, VN)", multiplier: 1.1 },
  { id: "kr", label: "Korea", multiplier: 1.35 },
];

const RANKED_QUEUES = [
  { id: "solo", label: "Ranked Solo/Duo", multiplier: 1 },
  { id: "flex", label: "Ranked Flex", multiplier: 0.85 },
];

const PLAY_MODES = [
  { id: "solo", label: "Solo", description: "A booster plays on your account.", multiplier: 1 },
  { id: "duo", label: "Duo", description: "You queue together with your booster.", multiplier: 1.5 },
];

const ADDONS: Record<"priority" | "stream" | "soloOnly" | "pro" | "bonusWin" | "champions" | "offline", Addon> = {
  priority: { id: "priority", label: "Priority completion", description: "Your order skips the queue and gets a dedicated booster.", pct: 25, flat: 0, defaultOn: false, modes: [] },
  stream: { id: "stream", label: "Stream games", description: "Watch every game live on a private stream.", pct: 15, flat: 0, defaultOn: false, modes: ["solo"] },
  soloOnly: { id: "solo-only", label: "Solo-only queue", description: "The booster never queues with another player on your account.", pct: 20, flat: 0, defaultOn: false, modes: ["solo"] },
  pro: { id: "pro-booster", label: "Grandmaster+ booster", description: "Only Grandmaster and Challenger players can claim your order.", pct: 20, flat: 0, defaultOn: false, modes: [] },
  bonusWin: { id: "bonus-win", label: "+1 bonus win", description: "One extra win after the goal to protect your new rank.", pct: 10, flat: 0, defaultOn: false, modes: [] },
  champions: { id: "champions", label: "Choose champions & roles", description: "Tell the booster which champions and roles to play.", pct: 0, flat: 0, defaultOn: true, modes: [] },
  offline: { id: "offline", label: "Appear offline", description: "Your friends list won't see the booster online.", pct: 0, flat: 0, defaultOn: true, modes: ["solo"] },
};

export const lolRankBoost: RankConfig = {
  tiers: [
    { id: "iron", name: "Iron", divisions: 4, stepPrice: 450, etaHours: 5 },
    { id: "bronze", name: "Bronze", divisions: 4, stepPrice: 550, etaHours: 6 },
    { id: "silver", name: "Silver", divisions: 4, stepPrice: 700, etaHours: 7 },
    { id: "gold", name: "Gold", divisions: 4, stepPrice: 950, etaHours: 9 },
    { id: "platinum", name: "Platinum", divisions: 4, stepPrice: 1300, etaHours: 11 },
    { id: "emerald", name: "Emerald", divisions: 4, stepPrice: 1800, etaHours: 14 },
    { id: "diamond", name: "Diamond", divisions: 4, stepPrice: 3400, etaHours: 22 },
    { id: "master", name: "Master", divisions: 0, stepPrice: 15000, etaHours: 96 },
    { id: "grandmaster", name: "Grandmaster", divisions: 0, stepPrice: 28000, etaHours: 168 },
    { id: "challenger", name: "Challenger", divisions: 0, stepPrice: 0, etaHours: 0 },
  ],
  divisionLabels: ["IV", "III", "II", "I"],
  lpBrackets: [
    { id: "0-20", label: "0–20 LP", discountPct: 0 },
    { id: "21-40", label: "21–40 LP", discountPct: 15 },
    { id: "41-60", label: "41–60 LP", discountPct: 30 },
    { id: "61-80", label: "61–80 LP", discountPct: 45 },
    { id: "81-100", label: "81–100 LP", discountPct: 60 },
  ],
  lpGain: [
    { id: "normal", label: "Normal (+20 or more)", multiplier: 1 },
    { id: "low", label: "Low (+16 to +19)", multiplier: 1.2 },
    { id: "very-low", label: "Very low (+15 or less)", multiplier: 1.45 },
  ],
  servers: LOL_SERVERS,
  queues: RANKED_QUEUES,
  modes: PLAY_MODES,
  addons: [ADDONS.priority, ADDONS.stream, ADDONS.soloOnly, ADDONS.pro, ADDONS.bonusWin, ADDONS.champions, ADDONS.offline],
  minPrice: 500,
  notesLabel: "Preferred champions or roles (optional)",
};

export const lolWinBoost: WinsConfig = {
  unitLabel: "win",
  unitLabelPlural: "wins",
  tierLabel: "Current rank",
  tiers: [
    { id: "iron", name: "Iron", unitPrice: 250, etaHours: 0.8 },
    { id: "bronze", name: "Bronze", unitPrice: 300, etaHours: 0.8 },
    { id: "silver", name: "Silver", unitPrice: 380, etaHours: 0.9 },
    { id: "gold", name: "Gold", unitPrice: 480, etaHours: 1 },
    { id: "platinum", name: "Platinum", unitPrice: 620, etaHours: 1.1 },
    { id: "emerald", name: "Emerald", unitPrice: 820, etaHours: 1.3 },
    { id: "diamond", name: "Diamond", unitPrice: 1350, etaHours: 1.8 },
    { id: "master", name: "Master", unitPrice: 2400, etaHours: 2.5 },
    { id: "grandmaster", name: "Grandmaster", unitPrice: 3400, etaHours: 3 },
    { id: "challenger", name: "Challenger", unitPrice: 4500, etaHours: 3.5 },
  ],
  min: 1,
  max: 20,
  defaultCount: 5,
  servers: LOL_SERVERS,
  queues: RANKED_QUEUES,
  modes: PLAY_MODES,
  addons: [ADDONS.priority, ADDONS.stream, ADDONS.soloOnly, ADDONS.pro, ADDONS.champions, ADDONS.offline],
  minPrice: 500,
  notesLabel: "Preferred champions or roles (optional)",
};

export const lolPlacements: WinsConfig = {
  unitLabel: "game",
  unitLabelPlural: "games",
  tierLabel: "Previous season rank",
  tiers: [
    { id: "unranked", name: "Unranked", unitPrice: 420, etaHours: 1 },
    { id: "iron", name: "Iron", unitPrice: 300, etaHours: 1 },
    { id: "bronze", name: "Bronze", unitPrice: 340, etaHours: 1 },
    { id: "silver", name: "Silver", unitPrice: 400, etaHours: 1 },
    { id: "gold", name: "Gold", unitPrice: 480, etaHours: 1 },
    { id: "platinum", name: "Platinum", unitPrice: 600, etaHours: 1.2 },
    { id: "emerald", name: "Emerald", unitPrice: 780, etaHours: 1.3 },
    { id: "diamond", name: "Diamond", unitPrice: 1200, etaHours: 1.6 },
    { id: "master", name: "Master+", unitPrice: 2000, etaHours: 2 },
  ],
  min: 1,
  max: 5,
  defaultCount: 5,
  servers: LOL_SERVERS,
  queues: RANKED_QUEUES,
  modes: PLAY_MODES,
  addons: [ADDONS.priority, ADDONS.stream, ADDONS.pro, ADDONS.champions, ADDONS.offline],
  minPrice: 500,
  notesLabel: "Preferred champions or roles (optional)",
};

export const lolArena: WinsConfig = {
  unitLabel: "win",
  unitLabelPlural: "wins",
  tierLabel: "Arena rating",
  tiers: [
    { id: "any", name: "Below Gladiator", unitPrice: 450, etaHours: 0.7 },
    { id: "gladiator", name: "Gladiator", unitPrice: 700, etaHours: 0.9 },
  ],
  min: 1,
  max: 30,
  defaultCount: 5,
  servers: LOL_SERVERS,
  queues: [],
  modes: PLAY_MODES,
  addons: [ADDONS.priority, ADDONS.stream, ADDONS.champions, ADDONS.offline],
  minPrice: 500,
  notesLabel: "Augments or champions you want unlocked (optional)",
};

export const lolNormals: WinsConfig = {
  unitLabel: "win",
  unitLabelPlural: "wins",
  tierLabel: "Game mode",
  tiers: [
    { id: "draft", name: "Normal Draft", unitPrice: 300, etaHours: 0.7 },
    { id: "swiftplay", name: "Swiftplay", unitPrice: 250, etaHours: 0.5 },
    { id: "aram", name: "ARAM", unitPrice: 220, etaHours: 0.5 },
  ],
  min: 1,
  max: 30,
  defaultCount: 5,
  servers: LOL_SERVERS,
  queues: [],
  modes: PLAY_MODES,
  addons: [ADDONS.priority, ADDONS.stream, ADDONS.champions, ADDONS.offline],
  minPrice: 500,
  notesLabel: "Preferred champions or roles (optional)",
};

export const lolMastery: LevelConfig = {
  unitLabel: "mastery level",
  min: 1,
  max: 20,
  bands: [
    { upTo: 4, price: 350, etaHours: 2 },
    { upTo: 7, price: 600, etaHours: 3 },
    { upTo: 10, price: 900, etaHours: 4 },
    { upTo: 20, price: 1200, etaHours: 5 },
  ],
  subjectLabel: "Champion",
  servers: LOL_SERVERS,
  queues: [],
  modes: [],
  addons: [ADDONS.priority, ADDONS.stream, ADDONS.offline],
  minPrice: 500,
  notesLabel: "Champion (for example: Ahri)",
};

export const lolCoaching: HoursConfig = {
  rates: [
    { id: "diamond", label: "Diamond coach", description: "Fundamentals, laning and macro for Iron–Emerald players.", hourly: 1500 },
    { id: "master", label: "Master coach", description: "Role-specific coaching and VOD breakdowns.", hourly: 2200 },
    { id: "challenger", label: "Challenger coach", description: "High-elo decision making with a top-ladder player.", hourly: 3200 },
  ],
  min: 1,
  max: 10,
  servers: LOL_SERVERS,
  queues: [],
  modes: [],
  addons: [{ id: "vod", label: "Extra VOD review", description: "Written review of one of your recorded games.", pct: 0, flat: 1200, defaultOn: false, modes: [] }],
  minPrice: 1000,
  notesLabel: "Your role, main champions and what you want to improve",
};

/** Example of a package-based service template for other games (Admin → Services). */
export const exampleFixed: FixedConfig = {
  packages: [
    { id: "starter", label: "Starter package", description: "A small, fixed scope job.", price: 1500, etaHours: 24 },
    { id: "pro", label: "Pro package", description: "A larger, fixed scope job.", price: 3900, etaHours: 72 },
  ],
  servers: [{ id: "global", label: "Global", multiplier: 1 }],
  queues: [],
  modes: [],
  addons: [ADDONS.priority],
  minPrice: 500,
};

type ServiceSeed = {
  slug: string;
  name: string;
  tagline: string;
  calculator: "RANK" | "WINS" | "LEVEL" | "HOURS" | "FIXED";
  config: unknown;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  description: string;
  faq: { q: string; a: string }[];
};

const SAFETY_FAQ = [
  {
    q: "Is my account safe during the boost?",
    a: "Boosters play only with their own skill: no scripts, no third-party programs and no chatting in game. You can enable Appear offline and Solo-only queue, and you can pause the order from your dashboard at any time.",
  },
  {
    q: "When does my booster start?",
    a: "Paid orders appear on the booster board immediately. Most orders are claimed within an hour; Priority completion moves yours to the top.",
  },
  {
    q: "What if something goes wrong?",
    a: "Your payment is held in escrow until you confirm the order is done. If the booster can't deliver, open a dispute from the order page and our staff will refund you.",
  },
];

export const LOL_SERVICES: ServiceSeed[] = [
  {
    slug: "rank-boost",
    name: "Rank Boost",
    tagline: "From your current division to the rank you want.",
    calculator: "RANK",
    config: lolRankBoost,
    sortOrder: 1,
    seoTitle: "LoL Rank Boost — Elo Boosting from Iron to Challenger",
    seoDescription:
      "Buy a League of Legends rank boost with transparent pricing. Vetted high-elo boosters, solo or duo, escrow-protected payment and live order tracking.",
    description: `## How a LoL rank boost works
Pick your current tier, division and LP, then the rank you want to reach. The price updates as you choose, and every line of it is shown before you pay: the divisions you climb, your LP, your server and any extras.

After checkout your order appears on the booster board, where an approved high-elo player claims it. You can follow every game from your dashboard, chat with your booster, and pause the order whenever you want to play yourself.

## Solo or duo
**Solo:** the booster logs into your account and plays your games. It's the fastest option, and with Appear offline nobody on your friends list will notice.

**Duo:** you queue together with your booster on your own account and never share a password. It costs more because the booster is giving you their time, but you learn from every game you win together.

## Why players pick Boosterinio
- **Approved boosters only.** Every booster applies and is checked by our staff before they can claim an order.
- **Escrow payment.** Your money is only released to the booster after the goal is reached and you confirm it.
- **Clear pricing.** You see what each option adds before you pay. We recalculate on our server, so the price you see is the price you pay.
- **Human support.** Tickets and order chat are handled by real people.

## LP and LP gain
If you're already deep into your division, you pay less for the first step. If your account gains very little LP per win, the boost needs more games to climb, which is why low LP gain adds to the price.`,
    faq: [
      { q: "How long does a rank boost take?", a: "Each division takes a few hours to a day depending on the tier. The estimate under the price updates as you configure the boost; Priority completion shortens it." },
      { q: "Can I play while my boost is in progress?", a: "Yes. Pause the order from your dashboard, play your games, then resume it. Please don't play ranked on the same queue while the booster is active." },
      ...SAFETY_FAQ,
    ],
  },
  {
    slug: "win-boost",
    name: "Win Boost",
    tagline: "Buy a set number of ranked wins.",
    calculator: "WINS",
    config: lolWinBoost,
    sortOrder: 2,
    seoTitle: "LoL Win Boost — Buy Ranked Net Wins",
    seoDescription: "Get a number of guaranteed ranked wins in League of Legends. Losses don't count, prices by rank, solo or duo, escrow-protected.",
    description: `## What you get
A win boost buys a number of **net wins** in ranked: if a game is lost, the booster plays an extra one, so you always receive the wins you paid for.

It's the right choice when you're close to promotion, recovering MMR after a losing streak, or want a few strong games on your record without committing to a full division boost.

## Pricing
Wins are priced by your current rank, because higher-elo games take longer and need stronger boosters. Your server, queue and play mode adjust the price, and every adjustment is itemized before you pay.`,
    faq: [{ q: "What happens if the booster loses a game?", a: "Losses don't count. The booster keeps playing until you have the number of net wins you bought." }, ...SAFETY_FAQ],
  },
  {
    slug: "placement-matches",
    name: "Placement Matches",
    tagline: "Start the season on the right foot.",
    calculator: "WINS",
    config: lolPlacements,
    sortOrder: 3,
    seoTitle: "LoL Placement Matches Boost — Start the Season Higher",
    seoDescription: "Have a high-elo player play your League of Legends placement games for a stronger starting rank. Priced per game by last season's rank.",
    description: `## Placements decide your starting point
Your first ranked games of a split weigh heavily on your MMR. A strong start means a higher starting rank and better LP gains for the rest of the season.

Pick your previous season's rank and the number of placement games you want played. The booster plays them on your account (or with you in duo), and you see every result on your order page.`,
    faq: [{ q: "Is a win guaranteed in every placement game?", a: "Placement games are paid per game played. Our boosters average a very high win rate, but individual results aren't guaranteed." }, ...SAFETY_FAQ],
  },
  {
    slug: "arena-boost",
    name: "Arena Boost",
    tagline: "Arena wins and augment unlocks.",
    calculator: "WINS",
    config: lolArena,
    sortOrder: 4,
    seoTitle: "LoL Arena Boost — Arena Wins with a Pro Partner",
    seoDescription: "Buy League of Legends Arena wins played by experienced boosters. Solo or duo with a booster, transparent pricing, escrow payment.",
    description: `## Arena, without the grind
Arena rewards first-place finishes. Tell us how many wins you need and whether you want to play alongside your booster. Use the notes field to list augments or champions you still need for challenges.`,
    faq: SAFETY_FAQ,
  },
  {
    slug: "normal-matches",
    name: "Normal Matches",
    tagline: "Unranked wins for unlocks and quests.",
    calculator: "WINS",
    config: lolNormals,
    sortOrder: 5,
    seoTitle: "LoL Normal Wins Boost — Draft, Swiftplay and ARAM",
    seoDescription: "Buy League of Legends normal game wins in Draft, Swiftplay or ARAM for quests, events and unlocks.",
    description: `## Wins in normal queues
Need wins for an event pass, a ranked-ready account or a champion quest? Pick the game mode and the number of wins, and a booster plays them for you.`,
    faq: SAFETY_FAQ,
  },
  {
    slug: "champion-mastery",
    name: "Champion Mastery",
    tagline: "Level up mastery on the champion you love.",
    calculator: "LEVEL",
    config: lolMastery,
    sortOrder: 6,
    seoTitle: "LoL Champion Mastery Boost — Any Champion, Any Level",
    seoDescription: "Raise your League of Legends champion mastery level with a booster who mains that champion. Priced per level.",
    description: `## Mastery, earned in real games
Choose the champion and the mastery levels you want. A booster who plays that champion at a high level earns the grades and points in normal or ranked games, whichever you prefer.`,
    faq: SAFETY_FAQ,
  },
  {
    slug: "coaching",
    name: "Coaching",
    tagline: "One-on-one sessions with a high-elo coach.",
    calculator: "HOURS",
    config: lolCoaching,
    sortOrder: 7,
    seoTitle: "LoL Coaching — One-on-One Lessons with High-Elo Coaches",
    seoDescription: "Book League of Legends coaching with Diamond, Master or Challenger coaches. Live sessions over voice and screen share, plus VOD reviews.",
    description: `## Learn to climb on your own
A coaching session is a live call with screen share. Your coach watches you play or reviews your recorded games, and focuses on the habits holding you back: wave management, jungle tracking, trading, or teamfight positioning.

Tell us your role and goals in the notes, and pick the coach level that fits your rank.`,
    faq: [
      { q: "How are sessions scheduled?", a: "After checkout your coach messages you on the order page to agree on times that suit you both." },
      { q: "Do I need any software?", a: "Discord or any voice app with screen sharing is enough. Your coach never needs your password." },
    ],
  },
];

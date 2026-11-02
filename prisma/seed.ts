/*
  Seeds the catalog (games + League of Legends boosting services).
  Safe to run on every deploy: everything is an upsert keyed by slug, and
  existing prices edited in the admin panel are NOT overwritten.

  Local demo data (sellers, listings, orders, tickets) is opt-in:
    SEED_DEMO=true npm run db:seed
  Never enable it on production.
*/
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { randomUUID, createCipheriv, randomBytes } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { LOL_SERVICES } from "../src/lib/boosting/presets";
import { GAMES } from "../src/lib/games-data";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }) });

async function seedCatalog() {
  for (const [i, g] of GAMES.entries()) {
    await db.game.upsert({
      where: { slug: g.slug },
      create: {
        slug: g.slug,
        name: g.name,
        shortName: g.shortName,
        publisher: g.publisher,
        description: g.description,
        color: g.color,
        categories: g.categories,
        currencyName: g.currencyName,
        platforms: g.platforms,
        servers: g.servers,
        isFeatured: !!g.featured,
        boostingEnabled: !!g.boosting,
        sortOrder: (i + 1) * 10,
      },
      update: {},
    });
  }
  const lol = await db.game.findUniqueOrThrow({ where: { slug: "league-of-legends" } });
  for (const s of LOL_SERVICES) {
    await db.boostService.upsert({
      where: { gameId_slug: { gameId: lol.id, slug: s.slug } },
      create: {
        gameId: lol.id,
        slug: s.slug,
        name: s.name,
        tagline: s.tagline,
        description: s.description,
        calculator: s.calculator,
        config: s.config as never,
        faq: s.faq as never,
        sortOrder: s.sortOrder,
        seoTitle: s.seoTitle,
        seoDescription: s.seoDescription,
      },
      update: {},
    });
  }
  console.log(`Catalog: ${GAMES.length} games, ${LOL_SERVICES.length} LoL services.`);
}

// ───────────────────────── demo data (local only) ─────────────────────────

function enc(plain: string) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, "base64");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1.${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${data.toString("base64url")}`;
}

async function user(email: string, name: string, password: string, role: "USER" | "SUPPORT" | "ADMIN" = "USER") {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return existing;
  const id = randomUUID();
  return db.user.create({
    data: {
      id,
      email,
      name,
      role,
      emailVerified: true,
      accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) } },
    },
  });
}

async function seedDemo() {
  const password = process.env.SEED_DEMO_PASSWORD || "boosterinio-demo";
  const admin = await user("admin@boosterinio.local", "Demo Admin", password, "ADMIN");
  const buyer = await user("buyer@boosterinio.local", "Demo Buyer", password);
  const sellerUser = await user("seller@boosterinio.local", "Demo Seller", password);
  const boosterUser = await user("booster@boosterinio.local", "Demo Booster", password);
  const applicant = await user("applicant@boosterinio.local", "Demo Applicant", password);

  const seller = await db.sellerProfile.upsert({
    where: { userId: sellerUser.id },
    create: {
      userId: sellerUser.id,
      slug: "demo-vault",
      displayName: "Demo Vault",
      bio: "Demo seller account for local testing.",
      status: "APPROVED",
      applicationType: "SELLER",
      canSell: true,
      games: ["league-of-legends", "valorant", "world-of-warcraft", "fortnite", "roblox"],
      reviewedAt: new Date(),
    },
    update: {},
  });
  const booster = await db.sellerProfile.upsert({
    where: { userId: boosterUser.id },
    create: {
      userId: boosterUser.id,
      slug: "demo-booster",
      displayName: "Demo Booster",
      bio: "Demo booster account for local testing.",
      status: "APPROVED",
      applicationType: "BOOSTER",
      canBoost: true,
      peakRank: "Grandmaster",
      servers: ["EUW", "EUNE"],
      games: ["league-of-legends"],
      reviewedAt: new Date(),
    },
    update: {},
  });
  await db.sellerProfile.upsert({
    where: { userId: applicant.id },
    create: {
      userId: applicant.id,
      slug: "demo-applicant",
      displayName: "Demo Applicant",
      status: "PENDING",
      applicationType: "BOTH",
      country: "Greece",
      discord: "demo_applicant",
      experience: "Demo application: 3 years selling LoL accounts, Master peak on EUW.",
      games: ["league-of-legends"],
      peakRank: "Master",
      servers: ["EUW"],
    },
    update: {},
  });

  const games = Object.fromEntries((await db.game.findMany()).map((g) => [g.slug, g.id]));
  const demoListings = [
    { game: "league-of-legends", cat: "ACCOUNT", title: "[Demo] EUW Diamond IV · 84 champions · 37 skins · name change ready", price: 6999, server: "EUW", attrs: { Rank: "Diamond IV", Level: 57, Champions: 84, Skins: 37 }, instant: true },
    { game: "league-of-legends", cat: "ACCOUNT", title: "[Demo] EUW unranked level 30 · hand-leveled · 50k BE", price: 1499, server: "EUW", attrs: { Rank: "Unranked", Level: 30, Champions: 20, "Blue Essence": "50,000" }, instant: true },
    { game: "league-of-legends", cat: "ACCOUNT", title: "[Demo] NA Emerald II · all champions · 120 skins", price: 12900, server: "NA", attrs: { Rank: "Emerald II", Level: 210, Champions: 172, Skins: 120 } },
    { game: "league-of-legends", cat: "TOPUP", title: "[Demo] 1,380 RP top-up · any server", price: 1050, unit: "1,380 RP", stock: 50 },
    { game: "valorant", cat: "ACCOUNT", title: "[Demo] EU Ascendant 2 · Reaver Vandal · Prime Phantom", price: 8900, server: "EU", attrs: { Rank: "Ascendant 2", Skins: 14, Agents: "All" } },
    { game: "valorant", cat: "TOPUP", title: "[Demo] 1,000 VP top-up · EU", price: 990, unit: "1,000 VP", stock: 40 },
    { game: "world-of-warcraft", cat: "CURRENCY", title: "[Demo] Retail EU gold · Silvermoon (Alliance) · fast face-to-face", price: 49, unit: "10,000 Gold", stock: 900, min: 5, server: "EU" },
    { game: "fortnite", cat: "ACCOUNT", title: "[Demo] OG account · Renegade Raider · 210 skins", price: 24900, attrs: { Skins: 210, "V-Bucks": 1200, Platform: "All" } },
    { game: "fortnite", cat: "TOPUP", title: "[Demo] 2,800 V-Bucks gift top-up", price: 1899, unit: "2,800 V-Bucks", stock: 25 },
    { game: "roblox", cat: "CURRENCY", title: "[Demo] Robux via group payout · 1,000 R$", price: 899, unit: "1,000 Robux", stock: 120 },
    { game: "counter-strike-2", cat: "ITEM", title: "[Demo] AK-47 | Redline (Field-Tested)", price: 1450, attrs: { Wear: "Field-Tested", Float: "0.18" } },
    { game: "gta-5", cat: "ACCOUNT", title: "[Demo] GTA Online PC · rank 250 · $2B · all properties", price: 3500, attrs: { Rank: 250, Money: "$2,000,000,000", Platform: "PC" } },
  ];
  for (const [i, l] of demoListings.entries()) {
    const slug = `demo-${i + 1}-${l.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50)}`;
    const listing = await db.listing.upsert({
      where: { slug },
      create: {
        sellerId: seller.id,
        gameId: games[l.game],
        category: l.cat as never,
        title: l.title,
        slug,
        description:
          "Demo listing created by the local seed script.\n\nFull access, original email included. Change the password and email after delivery. Message me in the order chat if anything is unclear.",
        price: l.price,
        stock: l.stock ?? 1,
        minQuantity: l.min ?? 1,
        unitLabel: l.unit,
        deliveryMethod: l.instant ? "INSTANT" : "MANUAL",
        deliveryTime: l.instant ? 1 : 30,
        server: l.server,
        attributes: (l.attrs ?? undefined) as never,
        status: "ACTIVE",
        featured: i < 4,
      },
      update: {},
    });
    if (l.instant) {
      const has = await db.stockItem.count({ where: { listingId: listing.id } });
      if (!has) {
        await db.stockItem.create({
          data: { listingId: listing.id, payload: enc(`Login: demo_account_${i}\nPassword: demo-password-${i}\nEmail: demo${i}@example.com`) },
        });
      }
    }
  }
  await db.listing.upsert({
    where: { slug: "demo-pending-review" },
    create: {
      sellerId: seller.id,
      gameId: games["league-of-legends"],
      category: "ACCOUNT",
      title: "[Demo] EUW Master · waiting for review",
      slug: "demo-pending-review",
      description: "A listing waiting in the moderation queue.",
      price: 18900,
      status: "PENDING",
      server: "EUW",
      attributes: { Rank: "Master", Level: 320 } as never,
    },
    update: {},
  });

  const rank = await db.boostService.findFirst({ where: { slug: "rank-boost" } });
  if (rank && !(await db.order.count({ where: { buyerId: buyer.id } }))) {
    const mk = (n: string, status: string, extra: Record<string, unknown> = {}) =>
      db.order.create({
        data: {
          number: n,
          type: "BOOST",
          status: status as never,
          buyerId: buyer.id,
          serviceId: rank.id,
          title: "Rank Boost: Silver I → Gold IV",
          summary: "Silver I → Gold IV · Europe West · Ranked Solo/Duo",
          gameName: "League of Legends",
          gameSlug: "league-of-legends",
          subtotal: 1235,
          total: 1235,
          payoutAmount: 865,
          platformFee: 370,
          paymentProvider: "TEST",
          paidAt: new Date(),
          boostConfig: {
            selection: { fromTier: "silver", fromDivision: 3, toTier: "gold", toDivision: 0, server: "euw", queue: "solo", mode: "solo", addons: ["champions", "offline"], lp: "0-20", lpGain: "normal" },
            facts: [
              { label: "Current rank", value: "Silver I" },
              { label: "Desired rank", value: "Gold IV" },
              { label: "Server", value: "Europe West" },
              { label: "Queue", value: "Ranked Solo/Duo" },
            ],
            lines: [],
            etaHours: 9,
            calculator: "RANK",
          } as never,
          messages: { create: [{ kind: "SYSTEM", body: "Demo order created by the seed script." }] },
          ...extra,
        },
      });
    await mk("BST-DEMO01", "PAID");
    await mk("BST-DEMO02", "IN_PROGRESS", { boosterId: booster.id, startedAt: new Date(), boostProgress: { currentRank: "Silver I 60 LP", wins: 3, losses: 1 } as never });
    await db.sellerProfile.update({ where: { id: booster.id }, data: { pendingBalance: { increment: 865 } } });
  }

  if (!(await db.ticket.count())) {
    await db.ticket.create({
      data: {
        userId: buyer.id,
        subject: "Can I change my server after paying?",
        category: "BOOSTING",
        messages: { create: { authorId: buyer.id, body: "Demo ticket: I picked EUW but my account is on EUNE. Can you change it?" } },
      },
    });
  }
  console.log(`Demo data ready. Accounts use password "${password}": admin@ / buyer@ / seller@ / booster@ / applicant@boosterinio.local`);
  void admin;
}

seedCatalog()
  .then(() => (process.env.SEED_DEMO === "true" ? seedDemo() : undefined))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

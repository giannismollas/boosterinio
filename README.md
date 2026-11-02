# Boosterinio

A gaming marketplace and boosting platform: League of Legends boosting at launch, a marketplace (accounts, currency, items, top-ups, gift cards) for 48 games, approved sellers and boosters, escrow-protected payments, and an admin panel for tickets, approvals, moderation, disputes and payouts.

**Stack:** Next.js 16 (App Router, server actions) · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma 7 · Better Auth · Stripe, PayPal and NOWPayments · Resend email · S3-compatible storage (Cloudflare R2).

---

## What's inside

| Area | Where | What it does |
|---|---|---|
| Storefront | `/`, `/games`, `/[game]`, `/accounts`… | Home with the live LoL rank board and price estimate, game select, category hubs with filters; listing cards with photos, detail chips and seller rating |
| Boosting | `/[game]/boosting/[service]` | Configurator for 7 LoL services (rank, wins, placements, Arena, normals, mastery, coaching) with itemized prices |
| Marketplace | `/[game]/[category]/[listing]` | Listing pages with a photo gallery and full-screen viewer, buy box, seller card (verified badge, online status), reporting |
| Checkout & orders | `/checkout/[number]`, `/orders/[number]` | Pay with card/PayPal/crypto; order chat, boost progress, encrypted account access, delivery, confirm, dispute, review |
| Buyer account | `/dashboard` | Orders, support tickets, notifications, followed stores, settings |
| Sellers & boosters | `/sell`, `/seller` | Application, listings with up to 8 photos (drag and drop, pick the cover), manual or instant stock, sales, booster board, wallet and payouts, store profile with banner and avatar |
| Seller storefronts | `/sellers/[slug]` | Banner, avatar with online dot, verified badge, sold / rating / reviews / followers, Follow and Share, tabs for Store (a row per category), Reviews (with rating breakdown) and each category |
| Admin | `/admin` | Queues with live counts: orders, disputes, tickets, applications, listings, reports, payouts; catalog: games, services and pricing, coupons, reviews; users, settings, audit log |
| SEO | everywhere | Per-page metadata and canonicals, JSON-LD (Organization, WebSite, Product, FAQPage, BreadcrumbList, Article), `sitemap.xml`, `robots.txt`, Open Graph image |

### How money moves (escrow)

1. The buyer pays → order **PAID**; the price is always recalculated on the server.
2. Market orders put the seller's earnings in *pending*; boosts do it when a booster claims the order.
3. Seller/booster delivers → **DELIVERED**. The buyer confirms, or the order completes on its own after the protection window (default 72 h).
4. Earnings move from *pending* to *available*. Sellers request payouts; staff pay them (PayPal/bank/crypto) and mark them paid.
5. A dispute freezes everything until staff refund the buyer, release to the seller, or resume the order.

Fees are set in **Admin → Settings**: marketplace fee (default 10%) and booster share (default 70% of a boost).

---

## Run it locally

Requirements: Node.js 20.9+ (tested on 24) and a PostgreSQL database.

```bash
npm install
```

Start a local Postgres. The easiest option needs no Docker; it prints a `postgres://…` URL:

```bash
npx prisma dev --name boosterinio --detach
```

Copy `.env.example` to `.env` and fill in at least `DATABASE_URL` (with `DATABASE_POOL_MAX=1` for `prisma dev`), `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET` and set `PAYMENTS_TEST_MODE="true"`. Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Create the tables, load the catalog (and optional demo data), and start:

```bash
npx prisma migrate dev
```

```bash
SEED_DEMO=true npm run db:seed
```

```bash
npm run dev
```

Demo accounts (password `boosterinio-demo`, local only): `admin@`, `buyer@`, `seller@`, `booster@`, `applicant@boosterinio.local`. With `PAYMENTS_TEST_MODE=true`, checkout offers a **Test payment** that marks orders paid without money.

`npx tsx scripts/flow-check.ts` runs an end-to-end check of the order/escrow engine against the local demo data.

---

## Deploy: Railway (app) + Neon (database)

### 1. Database on Neon
1. Create a project at neon.tech (pick the region closest to your Railway region, e.g. Frankfurt for EU).
2. Copy two connection strings: the **pooled** one (host contains `-pooler`) → `DATABASE_URL`, and the **direct** one → `DIRECT_URL`. Keep `?sslmode=require`.

### 2. Code on GitHub
Push this folder to a private GitHub repository (`.env` is git-ignored; never commit it).

### 3. App on Railway
1. **New Project → Deploy from GitHub repo** → pick the repository.
2. **Variables:** add everything from `.env.example` with real values. Important ones:
   - `DATABASE_URL`, `DIRECT_URL`, `DATABASE_POOL_MAX=10`
   - `NEXT_PUBLIC_SITE_URL` and `BETTER_AUTH_URL` = your public URL (e.g. `https://boosterinio.com`)
   - `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET` (new random values, not your local ones)
   - `PAYMENTS_TEST_MODE=false`
3. **Settings → Deploy:** `railway.json` already sets these, but set them in the dashboard too (Railway is retiring that file format on 2026-12-01):
   - Build command: `npm run build`
   - Pre-deploy command: `npm run db:release` (runs migrations and the catalog seed; the seed never overwrites prices you edit in the admin)
   - Start command: `npm run start`
   - Healthcheck path: `/api/health`
4. **Networking:** generate a Railway domain or attach your own domain. If the URL changes, update `NEXT_PUBLIC_SITE_URL`/`BETTER_AUTH_URL` and **redeploy** (`NEXT_PUBLIC_*` values are baked in at build time).

### 4. Make yourself admin
Register on the live site, then run once from your machine (with `DATABASE_URL` pointing at Neon), or from the Railway service shell:

```bash
npm run make-admin -- you@example.com
```

Use `npm run make-admin -- agent@example.com SUPPORT` for support staff (tickets, disputes, moderation; no settings or role changes).

### 5. Scheduled job (auto-complete orders)
`/api/cron` completes delivered orders after the protection window and expires unpaid orders after 24 h. Call it every 15 minutes with the secret:

- **Railway cron service:** add a new service in the same project (Docker image `curlimages/curl`), set its start command to `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron`, add `CRON_SECRET` to its variables, and set **Cron Schedule** to `*/15 * * * *`.
- **Or** any external scheduler (e.g. cron-job.org) sending the same request.

### 6. Image uploads
Railway's disk is wiped on every deploy, so use object storage:
- **Cloudflare R2 (recommended):** create a bucket, enable its public URL (or connect a domain), create an API token with read/write access, then set `S3_ENDPOINT` (`https://<account-id>.r2.cloudflarestorage.com`), `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`, `S3_REGION=auto`.
- **Or** a Railway volume mounted at `/app/uploads` with `UPLOAD_DIR=/app/uploads`.

### 7. Payments
Each provider appears at checkout as soon as its keys are set.

**Stripe (cards, Apple Pay, Google Pay)**
1. Dashboard → Developers → API keys → `STRIPE_SECRET_KEY`.
2. Developers → Webhooks → add endpoint `https://YOUR_DOMAIN/api/webhooks/stripe` with events `checkout.session.completed` and `checkout.session.async_payment_succeeded` → copy the signing secret to `STRIPE_WEBHOOK_SECRET`.

**PayPal**
1. developer.paypal.com → Apps & Credentials → create an app (Live) → `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE=live`.
2. Add a webhook `https://YOUR_DOMAIN/api/webhooks/paypal` with events `CHECKOUT.ORDER.APPROVED` and `PAYMENT.CAPTURE.COMPLETED` → `PAYPAL_WEBHOOK_ID`.

**NOWPayments (crypto)**
1. nowpayments.io → Settings → API keys → `NOWPAYMENTS_API_KEY`.
2. Settings → IPN → generate the IPN secret → `NOWPAYMENTS_IPN_SECRET`. The callback URL is sent with each invoice automatically.
3. Crypto refunds can't be automated: when staff refund a crypto order, pay the buyer back manually from your wallet.

> **Provider policies:** Stripe and PayPal restrict some gaming goods (account sales and in-game currency in particular). Before launch, confirm with each provider that your categories are allowed; this is why crypto is included as a fallback. You can hide a category for a game in **Admin → Games**.

### 8. Email (Resend)
Verify your domain at resend.com, then set `RESEND_API_KEY` and `EMAIL_FROM`. Without a key, emails (password resets, order updates) are only written to the server log. Once email works you can set `REQUIRE_EMAIL_VERIFICATION=true`.

### 9. Social sign-in (optional)
- Discord: discord.com/developers → OAuth2 → redirect `https://YOUR_DOMAIN/api/auth/callback/discord`.
- Google: Google Cloud Console → OAuth client → redirect `https://YOUR_DOMAIN/api/auth/callback/google`.

### Launch checklist
- [ ] `PAYMENTS_TEST_MODE=false` and no demo data (`SEED_DEMO` unset)
- [ ] Payments tested with a real small order on each provider, webhooks returning 200
- [ ] Cron calling `/api/cron` every 15 minutes
- [ ] Uploads going to R2 (or a volume)
- [ ] Legal pages (`src/content/legal.ts`) reviewed for your country, `NEXT_PUBLIC_LEGAL_NAME` set
- [ ] `ENCRYPTION_KEY` stored safely (changing it makes stored account logins unreadable)
- [ ] Google Search Console: add the domain and submit `https://YOUR_DOMAIN/sitemap.xml`

---

## Running the business

- **Approve sellers and boosters:** Admin → Applications. Approving sets what they can do (sell, boost, or both).
- **Moderate listings:** Admin → Listings. With "Require listing approval" on (default), new and edited listings wait here. The first time a listing goes live, everyone following that store gets a notification.
- **Verified badge:** Admin → Users → open the seller → Verify seller. Grant it after checking identity and sales history; it shows next to the store name on the storefront and every listing, and you can remove it the same way.
- **Tickets:** Admin → Tickets. Public replies email the user; internal notes stay with staff.
- **Disputes:** Admin → Disputes → refund the buyer, release to the seller, or resume the order.
- **Payouts:** Admin → Payouts → send the money by the seller's chosen method, then mark it paid with the reference.
- **Prices:** Admin → Services. Each service has a JSON price config with a live test quote, and an optional card image shown on the game page.
- **Add boosting for another game:** Admin → Services → New service → pick the game and a calculator (Rank, Wins, Level, Hours or Fixed packages), start from the template, set tiers/prices, save. Turn on **Boosting** for that game in Admin → Games.
- **Coupons:** Admin → Coupons (percent or fixed, boost/market/all, limits and expiry).
- **Site notice:** Admin → Settings → Announcement shows a banner under the header.

### Price config reference

All amounts are integer **cents**. Common keys for every calculator:

```jsonc
{
  "servers": [{ "id": "euw", "label": "Europe West", "multiplier": 1 }],
  "queues":  [{ "id": "solo", "label": "Ranked Solo/Duo", "multiplier": 1 }],
  "modes":   [{ "id": "duo", "label": "Duo", "multiplier": 1.5 }],
  "addons":  [{ "id": "priority", "label": "Priority completion", "pct": 25, "flat": 0 }],
  "minPrice": 500,
  "notesLabel": "Preferred champions or roles (optional)"
}
```

- **RANK:** `tiers` (`id`, `name`, `divisions` 0–4, `stepPrice` per division, `etaHours`), `divisionLabels`, `lpBrackets` (discount on the first step), `lpGain` (multipliers).
- **WINS:** `tiers` (`unitPrice` per win/game, optional `divisions` to pick IV–I), `min`, `max`, `defaultCount`, `unitLabel`, `tierLabel`.
- **LEVEL:** `bands` (`upTo`, `price` per level), `min`, `max`, optional `subjectLabel` (e.g. "Champion") and `subjectOptions` (the allowed list).
- **HOURS:** `rates` (`hourly`), `min`, `max`.
- **FIXED:** `packages` (`price`, `etaHours`).

Extra keys any tier or config can use:

- Tier `image`: emblem shown in the picker (e.g. `/images/ranks/lol/gold.webp`).
- Tier `disabledModes`: play modes not allowed at that rank. LoL ships with `["duo"]` on Grandmaster and Challenger, because Riot keeps those ranks out of duo queue; a rank boost whose games are played there is solo only.
- Tier `lpInput: true`: ask for the current LP instead of a division (Master and above).
- Add-on `included: true`: always on, shown as "Included". Add-on `tierPct`: price per rank, e.g. `{ "master": 10 }` makes Champions & roles +10% from Master up.
- `optionGroups`: extra choices that scale the price, e.g. Mastery's "Current tokens" (0, 1 or 2).
- `version`: when the shipped LoL presets change, the seed upgrades services whose stored version is lower. Bump it in your own edits to stop a later upgrade from replacing them.

Game images live in `public/images/games/<slug>.webp` and LoL rank emblems in `public/images/ranks/lol/`. Change a game's image in Admin → Games.

---

## Project structure

```
prisma/              schema, migrations, seed (catalog + optional demo data)
src/app/(site)/      storefront, checkout, orders, dashboards, seller area
src/app/admin/       admin panel
src/app/api/         auth, uploads, webhooks (Stripe, PayPal, NOWPayments), cron, health
src/components/      UI kit (pink esports world), configurator, forms
src/lib/             pricing engine, catalog data, SEO helpers, utils
src/server/          db, auth, orders/escrow, payments, wallet, storage, email
src/content/legal.ts terms, privacy and refund policy templates
```

Rebrand by editing `src/lib/site.ts` (name, tagline, emails) and the logo in `src/components/brand.tsx`.

### Design system

The look is hot-pink esports: a near-black ground with diagonal pink light streaks, white heavy italic display type (Saira, set wide), the pink italic "B" mark, dark hairline cards, pink-outlined selection with P1 / GOAL tags, and pink outline icons. **Hot pink is the only accent**, and the slanted pink "Insert coin" plate (`btn-coin`) is reserved for the one main action on each screen (Buy boost / Pay / Save). Tokens live in `src/app/globals.css`; the rules, type ramp and components are written up in [DESIGN.md](DESIGN.md) (machine-readable copy in `.impeccable/design.json`). Read it before adding new pages so they stay in the world. Where every game cover and rank emblem came from is listed in [docs/image-sources.md](docs/image-sources.md).

**Not affiliated with Riot Games or any game publisher.** Rank crests and game tiles are original artwork; add licensed game images per game in Admin → Games (image URL) only if you have the rights.

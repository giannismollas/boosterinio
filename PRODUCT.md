# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + TypeScript + PostgreSQL (Prisma). Hosting confirmed by the owner: **Railway** (app, long-running Node server) + **Neon** (managed Postgres). Payments confirmed: **Stripe**, **NOWPayments (crypto)** and **PayPal**. Framework choice was delegated; Next.js chosen for SSR/SEO, server actions and a single deployable unit.

## Users

- **Buyers (gamers):** players who want to climb ranks faster (boosting), or buy accounts, in-game currency, items, top-ups and gift cards. They arrive from search or socials, often on mobile, and need to trust the site with money and sometimes their game account login.
- **Sellers:** individuals/shops listing accounts, currency, items, top-ups and gift cards. They must apply and be approved before selling.
- **Boosters:** high-rank players who apply, get approved, claim boosting orders and get paid per completed order.
- **Staff (owner/admins/support):** run the marketplace: approve sellers and boosters, moderate listings, handle support tickets, resolve disputes, process payouts, tune boosting prices.

## Product Purpose

A gaming marketplace and boosting platform: buyers purchase boosting services and game goods from vetted sellers/boosters, with payment held by the platform until delivery is confirmed. Success = completed orders without disputes, repeat buyers, and a growing pool of approved sellers/boosters.

## Positioning

(Inferred from the brief, not yet confirmed.) Trust-first: every seller and booster is approved by staff before they can sell, orders are escrow-protected (funds released only after delivery is confirmed or the protection window passes), and boosting prices are calculated transparently from the buyer's exact configuration.

## Operating Context

- Launch scope: **League of Legends boosting** is live first; every other major game is listed in the catalog and gains boosting services over time (added from the admin panel without code changes).
- Marketplace categories per game: accounts, currency, items, top-ups, gift cards.
- Order life cycle: configure/choose → pay → (boost: booster claims & plays / market: seller delivers) → buyer confirms or auto-confirm → seller/booster balance credited → payout request → staff pays out.
- Support happens through tickets and per-order chat; disputes freeze funds until staff resolve them.

## Capabilities and Constraints

- Seller and booster accounts require staff approval.
- Admin panel: tickets, all orders and items, seller/booster approvals, listing moderation, disputes/reports, payouts, games/services/pricing, coupons, users, settings.
- SEO is a first-class requirement (crawlable game/service/listing pages, structured data, sitemap).
- Must be deployable to Railway + Neon (ephemeral filesystem → object storage for uploads; scheduled jobs via cron endpoint).
- Default currency: EUR (configurable). Brand name kept in one config file.
- Not affiliated with game publishers; trademark disclaimer required in the footer.

## Brand Commitments

- Name: **Boosterinio** (confirmed by owner).
- Must look clearly distinct from GameBoost (dark UI with orange accents) — no orange-led identity.
- Identity requested as "unique and gaming style".

## Evidence on Hand

No real customers, reviews, order counts, partners or press exist yet. Do not fabricate testimonials, ratings, "millions of gamers" stats or Trustpilot scores; review sections must render real reviews from the database or an honest empty state.

## Product Principles

1. Trust is the product: approval gates, escrow, clear statuses and human support are visible at every money step.
2. Price clarity: buyers see exactly what they pay for before checkout; server recalculates every price.
3. Easy first purchase: pick game → pick service → configure → pay in a few clicks, on mobile too.
4. Staff efficiency: every queue (approvals, tickets, disputes, payouts) is one click from the admin overview.
5. Grow by configuration: new games and services are added as data, not code.

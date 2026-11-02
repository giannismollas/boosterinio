"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DELIVERY_PRESETS, MAX_ATTRIBUTES, splitStockItems } from "@/components/seller/constants";
import { fail, guard, ok, zodFieldErrors, type ActionState } from "@/lib/action";
import { CATEGORIES, PAYOUT_METHODS, type ListingCategoryKey } from "@/lib/catalog";
import { categoryUrl, listingUrl, orderUrl, sellerUrl } from "@/lib/urls";
import { formatMoney, parseMoney, randomCode, slugify } from "@/lib/utils";
import { getGames } from "@/server/catalog";
import { encrypt } from "@/server/crypto";
import { db, Prisma } from "@/server/db";
import { invalidate } from "@/server/memo";
import { audit, notify } from "@/server/notify";
import { claimBoostOrder, OrderError, type BoostOrderConfig } from "@/server/orders";
import { requireSeller, requireUser } from "@/server/session";
import { getSettings } from "@/server/settings";
import { requestPayout, WalletError } from "@/server/wallet";

// ───────────────────────── helpers ─────────────────────────

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

/** Only images we stored ourselves (local uploads or the configured bucket). */
function allowedImage(url: string) {
  if (url.startsWith("/uploads/")) return /^\/uploads\/[a-z0-9/._-]+$/i.test(url) && !url.includes("..");
  const pub = process.env.S3_PUBLIC_URL?.replace(/\/$/, "");
  return !!pub && url.startsWith(`${pub}/`) && !/\s/.test(url);
}

async function uniqueSellerSlug(name: string) {
  const base = slugify(name) || `seller-${randomCode(4).toLowerCase()}`;
  let slug = base;
  for (let i = 0; i < 6; i++) {
    const taken = await db.sellerProfile.findUnique({ where: { slug }, select: { id: true } });
    if (!taken) return slug;
    slug = `${base}-${randomCode(4).toLowerCase()}`;
  }
  return `${base}-${randomCode(8).toLowerCase()}`;
}

function revalidateListing(gameSlug: string, category: string, slug: string, sellerSlug: string) {
  try {
    revalidatePath(categoryUrl(gameSlug, category as ListingCategoryKey));
    revalidatePath(listingUrl({ slug, category, game: { slug: gameSlug } }));
    revalidatePath(`/${CATEGORIES[category as ListingCategoryKey].slug}`);
    revalidatePath(`/${gameSlug}`);
    revalidatePath(sellerUrl(sellerSlug));
  } catch {
    // revalidation is best effort
  }
  revalidatePath("/seller/listings");
  invalidate("listings");
}

// ───────────────────────── application ─────────────────────────

const applicationSchema = z
  .object({
    applicationType: z.enum(["SELLER", "BOOSTER", "BOTH"], { message: "Choose what you want to do." }),
    displayName: z.string().trim().min(3, "Use at least 3 characters.").max(32, "Keep it under 32 characters."),
    country: z.string().trim().min(2, "Enter your country.").max(56, "Keep it under 56 characters."),
    discord: z.string().trim().min(2, "Enter your Discord username.").max(40, "Keep it under 40 characters."),
    games: z.array(z.string()).min(1, "Pick at least one game."),
    experience: z
      .string()
      .trim()
      .min(30, "Tell us a bit more (at least 30 characters).")
      .max(2000, "Keep it under 2,000 characters."),
    peakRank: z.string().trim().max(40, "Keep it under 40 characters."),
    servers: z.string().trim().max(200, "Keep it under 200 characters."),
    proofUrl: z
      .string()
      .trim()
      .max(300, "That link is too long.")
      .refine((s) => s === "" || /^https?:\/\/\S+$/i.test(s), "Enter a full link starting with https://"),
    terms: z.literal("on", { message: "Accept the seller rules to apply." }),
  })
  .superRefine((v, ctx) => {
    if (v.applicationType !== "SELLER" && !v.peakRank) {
      ctx.addIssue({ code: "custom", path: ["peakRank"], message: "Boosters need to tell us their peak rank." });
    }
  });

export async function applyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const user = await requireUser("/sell");
    const parsed = applicationSchema.safeParse({
      applicationType: text(fd, "applicationType"),
      displayName: text(fd, "displayName"),
      country: text(fd, "country"),
      discord: text(fd, "discord"),
      games: fd.getAll("games").map(String),
      experience: text(fd, "experience"),
      peakRank: text(fd, "peakRank"),
      servers: text(fd, "servers"),
      proofUrl: text(fd, "proofUrl"),
      terms: fd.get("terms"),
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.", zodFieldErrors(parsed.error));
    const d = parsed.data;

    const active = new Set((await getGames()).map((g) => g.slug));
    const games = [...new Set(d.games)].filter((g) => active.has(g)).slice(0, 40);
    if (!games.length) return fail("Pick at least one game.", { games: "Pick at least one game." });

    const existing = await db.sellerProfile.findUnique({ where: { userId: user.id } });
    if (existing?.status === "PENDING") return fail("Your application is already being reviewed.");
    if (existing?.status === "APPROVED") return fail("You're already approved. Open your seller dashboard.");
    if (existing?.status === "SUSPENDED") return fail("Your seller account is suspended. Contact support.");

    const booster = d.applicationType !== "SELLER";
    const servers = booster
      ? d.servers
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 12)
      : [];
    const data = {
      displayName: d.displayName,
      applicationType: d.applicationType,
      country: d.country,
      discord: d.discord,
      games,
      experience: d.experience,
      peakRank: booster ? d.peakRank : null,
      servers,
      proofUrl: d.proofUrl || null,
      status: "PENDING" as const,
      canSell: false,
      canBoost: false,
      reviewNote: null,
      reviewedAt: null,
    };

    const profile = existing
      ? await db.sellerProfile.update({ where: { id: existing.id }, data })
      : await db.sellerProfile.create({ data: { ...data, userId: user.id, slug: await uniqueSellerSlug(d.displayName) } });

    await audit(user.id, existing ? "seller.reapply" : "seller.apply", "SellerProfile", profile.id, { type: d.applicationType });
    await notify(user.id, {
      title: "Application received",
      body: "Our staff will review your application and email you the result.",
      href: "/sell",
      email: true,
    });
    revalidatePath("/sell");
    return ok("Application sent. We'll email you when it's reviewed.");
  });
}

// ───────────────────────── listings ─────────────────────────

const listingSchema = z.object({
  gameId: z.string().min(1, "Choose a game."),
  category: z.enum(["ACCOUNT", "CURRENCY", "ITEM", "TOPUP", "GIFT_CARD"], { message: "Choose a category." }),
  title: z.string().trim().min(8, "Use at least 8 characters.").max(140, "Keep the title under 140 characters."),
  description: z
    .string()
    .trim()
    .min(20, "Describe what the buyer gets (at least 20 characters).")
    .max(5000, "Keep the description under 5,000 characters."),
  price: z
    .number({ message: "Enter a price." })
    .int()
    .min(50, `The minimum price is ${formatMoney(50)}.`)
    .max(10_000_000, "That price is too high."),
  deliveryMethod: z.enum(["INSTANT", "MANUAL"], { message: "Choose how you deliver." }),
  deliveryTime: z
    .number({ message: "Choose a delivery time." })
    .int()
    .refine((v) => DELIVERY_PRESETS.some((p) => p.minutes === v), "Choose a delivery time."),
  stock: z.number({ message: "Enter a whole number." }).int("Enter a whole number.").min(0, "Stock can't be negative.").max(100_000, "That's too much stock."),
  minQuantity: z
    .number({ message: "Enter a whole number." })
    .int("Enter a whole number.")
    .min(1, "The minimum order is at least 1.")
    .max(10_000, "That minimum is too high."),
  unitLabel: z.string().trim().max(40, "Keep the unit label under 40 characters."),
  server: z.string().trim().max(40),
  platform: z.string().trim().max(40),
  images: z.array(z.string().max(500)).max(8, "Up to 8 images."),
});

function readAttributes(fd: FormData): { ok: true; value: Record<string, string> } | { ok: false; error: string } {
  const keys = fd.getAll("attrKey").map(String);
  const values = fd.getAll("attrValue").map(String);
  const out: Record<string, string> = {};
  for (let i = 0; i < Math.min(keys.length, MAX_ATTRIBUTES); i++) {
    const k = keys[i]?.trim() ?? "";
    const v = values[i]?.trim() ?? "";
    if (!k && !v) continue;
    if (!k || !v) return { ok: false, error: "Each detail needs both a name and a value." };
    if (k.length > 30) return { ok: false, error: "Detail names must be 30 characters or less." };
    if (v.length > 80) return { ok: false, error: "Detail values must be 80 characters or less." };
    out[k] = v;
  }
  return { ok: true, value: out };
}

export async function saveListingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const created: { url?: string } = {};
  const result = await guard(async () => {
    const { profile } = await requireSeller("sell");
    const id = text(fd, "id") || null;

    const parsed = listingSchema.safeParse({
      gameId: text(fd, "gameId"),
      category: text(fd, "category"),
      title: text(fd, "title"),
      description: text(fd, "description"),
      price: parseMoney(text(fd, "price")) ?? Number.NaN,
      deliveryMethod: text(fd, "deliveryMethod"),
      deliveryTime: Number(text(fd, "deliveryTime") || 60),
      stock: Number(text(fd, "stock") || 0),
      minQuantity: Number(text(fd, "minQuantity") || 1),
      unitLabel: text(fd, "unitLabel"),
      server: text(fd, "server"),
      platform: text(fd, "platform"),
      images: fd.getAll("images").map(String),
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.", zodFieldErrors(parsed.error));
    const d = parsed.data;

    const game = (await getGames()).find((g) => g.id === d.gameId);
    if (!game) return fail("Choose a game.", { gameId: "Choose a game." });
    if (!game.categories.includes(d.category)) {
      const msg = `${game.name} doesn't have a ${CATEGORIES[d.category].label} section.`;
      return fail(msg, { category: msg });
    }
    if (d.server && game.servers.length && !game.servers.includes(d.server)) {
      return fail("Choose a server from the list.", { server: "Choose a server from the list." });
    }
    if (d.platform && game.platforms.length && !game.platforms.includes(d.platform)) {
      return fail("Choose a platform from the list.", { platform: "Choose a platform from the list." });
    }

    const attrs = readAttributes(fd);
    if (!attrs.ok) return fail(attrs.error, { attributes: attrs.error });
    const images = d.images.filter(allowedImage);
    const items = splitStockItems(text(fd, "stockItems"));
    if (items.length > 200) return fail("Add up to 200 items at a time.", { stockItems: "Add up to 200 items at a time." });
    if (items.some((i) => i.length > 2000)) return fail("Each item must be 2,000 characters or less.", { stockItems: "Each item must be 2,000 characters or less." });

    const settings = await getSettings();
    const instant = d.deliveryMethod === "INSTANT";
    const fields = {
      gameId: game.id,
      category: d.category,
      title: d.title,
      description: d.description,
      price: d.price,
      minQuantity: instant ? 1 : d.minQuantity,
      unitLabel: d.unitLabel || null,
      deliveryMethod: d.deliveryMethod,
      deliveryTime: instant ? 5 : d.deliveryTime,
      server: d.server || null,
      platform: d.platform || null,
      attributes: Object.keys(attrs.value).length ? attrs.value : Prisma.DbNull,
      images,
    };

    // ── create ──
    if (!id) {
      if (instant && items.length === 0) {
        return fail("Add at least one item for instant delivery.", { stockItems: "Add at least one item for instant delivery." });
      }
      if (!instant && d.stock < 1) return fail("Stock must be at least 1.", { stock: "Stock must be at least 1." });
      const listing = await db.listing.create({
        data: {
          ...fields,
          sellerId: profile.id,
          slug: `${slugify(d.title) || "listing"}-${randomCode(5).toLowerCase()}`,
          stock: instant ? items.length : d.stock,
          status: settings.requireListingApproval ? "PENDING" : "ACTIVE",
          stockItems: instant ? { create: items.map((p) => ({ payload: encrypt(p) })) } : undefined,
        },
      });
      await audit(profile.userId, "listing.create", "Listing", listing.id, { status: listing.status });
      revalidateListing(game.slug, d.category, listing.slug, profile.slug);
      created.url = `/seller/listings?saved=${settings.requireListingApproval ? "review" : "live"}`;
      return ok("Listing saved.");
    }

    // ── update ──
    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing || existing.sellerId !== profile.id || existing.status === "REMOVED") return fail("Listing not found.");

    const material =
      existing.gameId !== fields.gameId ||
      existing.category !== fields.category ||
      existing.title !== fields.title ||
      existing.description !== fields.description ||
      JSON.stringify(existing.images) !== JSON.stringify(images) ||
      JSON.stringify(existing.attributes ?? {}) !== JSON.stringify(attrs.value) ||
      (existing.server ?? "") !== d.server ||
      (existing.platform ?? "") !== d.platform;

    const updated = await db.$transaction(async (tx) => {
      if (instant && items.length) {
        await tx.stockItem.createMany({ data: items.map((p) => ({ listingId: existing.id, payload: encrypt(p) })) });
      }
      const stock = instant ? await tx.stockItem.count({ where: { listingId: existing.id, orderId: null } }) : d.stock;
      let status = existing.status;
      if (status === "REJECTED" || status === "DRAFT") {
        status = settings.requireListingApproval ? "PENDING" : stock > 0 ? "ACTIVE" : "SOLD_OUT";
      } else if (status !== "PENDING" && material && settings.requireListingApproval) {
        status = "PENDING";
      } else if (status === "ACTIVE" && stock === 0) {
        status = "SOLD_OUT";
      } else if (status === "SOLD_OUT" && stock > 0) {
        status = "ACTIVE";
      }
      return tx.listing.update({
        where: { id: existing.id },
        data: { ...fields, stock, status, rejectionReason: status === "PENDING" ? null : existing.rejectionReason },
      });
    });

    await audit(profile.userId, "listing.update", "Listing", existing.id, { status: updated.status, material });
    revalidateListing(game.slug, d.category, existing.slug, profile.slug);
    revalidatePath(`/seller/listings/${existing.id}/edit`);
    if (updated.status === "PENDING" && existing.status !== "PENDING") return ok("Saved. Your changes go live after staff review.");
    return ok(items.length ? `Saved. ${items.length} item${items.length === 1 ? "" : "s"} added to stock.` : "Changes saved.");
  });
  if (created.url) redirect(created.url);
  return result;
}

async function ownListing(fd: FormData) {
  const { profile } = await requireSeller("sell");
  const listing = await db.listing.findUnique({ where: { id: text(fd, "id") }, include: { game: { select: { slug: true } } } });
  if (!listing || listing.sellerId !== profile.id || listing.status === "REMOVED") throw new OrderError("Listing not found.");
  return { profile, listing };
}

export async function toggleListingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const { profile, listing } = await ownListing(fd);
    if (listing.status === "ACTIVE") {
      await db.listing.update({ where: { id: listing.id }, data: { status: "PAUSED" } });
      revalidateListing(listing.game.slug, listing.category, listing.slug, profile.slug);
      return ok("Listing paused. Buyers can't see it until you resume it.");
    }
    if (listing.status === "PAUSED") {
      const stock =
        listing.deliveryMethod === "INSTANT" ? await db.stockItem.count({ where: { listingId: listing.id, orderId: null } }) : listing.stock;
      await db.listing.update({ where: { id: listing.id }, data: { status: stock > 0 ? "ACTIVE" : "SOLD_OUT", stock } });
      revalidateListing(listing.game.slug, listing.category, listing.slug, profile.slug);
      return ok(stock > 0 ? "Listing is live again." : "Resumed, but it's out of stock. Add stock to sell it.");
    }
    return fail("Only live or paused listings can be paused or resumed.");
  }, [OrderError]);
}

export async function deleteListingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const done: { deleted?: boolean } = {};
  const result = await guard(async () => {
    const { profile, listing } = await ownListing(fd);
    await db.$transaction([
      db.stockItem.deleteMany({ where: { listingId: listing.id, orderId: null } }),
      db.listing.update({ where: { id: listing.id }, data: { status: "REMOVED", stock: 0 } }),
    ]);
    await audit(profile.userId, "listing.delete", "Listing", listing.id);
    revalidateListing(listing.game.slug, listing.category, listing.slug, profile.slug);
    done.deleted = true;
    return ok("Listing deleted.");
  }, [OrderError]);
  // From the edit page the listing no longer exists, so go back to the list.
  if (done.deleted && text(fd, "next") === "/seller/listings") redirect("/seller/listings");
  return result;
}

export async function clearStockAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const { profile, listing } = await ownListing(fd);
    if (listing.deliveryMethod !== "INSTANT") return fail("Only instant-delivery listings keep stock items.");
    const removed = await db.stockItem.deleteMany({ where: { listingId: listing.id, orderId: null } });
    await db.listing.update({
      where: { id: listing.id },
      data: { stock: 0, ...(listing.status === "ACTIVE" ? { status: "SOLD_OUT" } : {}) },
    });
    await audit(profile.userId, "listing.clear_stock", "Listing", listing.id, { removed: removed.count });
    revalidateListing(listing.game.slug, listing.category, listing.slug, profile.slug);
    revalidatePath(`/seller/listings/${listing.id}/edit`);
    return ok(`Removed ${removed.count} undelivered item${removed.count === 1 ? "" : "s"}.`);
  }, [OrderError]);
}

// ───────────────────────── boosting ─────────────────────────

export async function claimBoostAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const target: { number?: string } = {};
  const result = await guard(async () => {
    const { profile } = await requireSeller("boost");
    const order = await db.order.findUnique({
      where: { id: text(fd, "orderId") },
      select: { id: true, number: true, type: true, boostConfig: true },
    });
    if (!order || order.type !== "BOOST") return fail("Order not found.");
    const cfg = order.boostConfig as BoostOrderConfig | null;
    const addons = (cfg?.selection as { addons?: string[] } | null | undefined)?.addons ?? [];
    if (addons.includes("pro-booster") && !/grand\s*master|challenger/i.test(profile.peakRank ?? "")) {
      return fail("This order needs a Grandmaster or Challenger booster.");
    }
    await claimBoostOrder(order.id, profile);
    target.number = order.number;
    revalidatePath("/seller/boosts");
    revalidatePath("/seller");
    return ok("Order claimed.");
  }, [OrderError]);
  if (target.number) redirect(orderUrl(target.number));
  return result;
}

// ───────────────────────── wallet & profile ─────────────────────────

export async function requestPayoutAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(
    async () => {
      const { profile } = await requireSeller();
      const amount = parseMoney(text(fd, "amount"));
      if (amount === null || amount <= 0) return fail("Enter the amount to withdraw.", { amount: "Enter the amount to withdraw." });
      const method = text(fd, "method");
      if (!PAYOUT_METHODS.some((m) => m.id === method)) return fail("Choose a payout method.", { method: "Choose a payout method." });
      const details = text(fd, "details").trim();
      if (details.length < 5) return fail("Add your payout details.", { details: "Add your payout details." });

      await requestPayout(profile.id, amount, method, details);
      if (fd.get("saveDefault") === "on") {
        await db.sellerProfile.update({ where: { id: profile.id }, data: { payoutMethod: method, payoutDetails: details.slice(0, 500) } });
      }
      await audit(profile.userId, "payout.request", "SellerProfile", profile.id, { amount, method });
      revalidatePath("/seller/wallet");
      revalidatePath("/seller");
      return ok(`Payout of ${formatMoney(amount)} requested. Staff will process it soon.`);
    },
    [WalletError],
  );
}

const storeProfileSchema = z.object({
  displayName: z.string().trim().min(3, "Use at least 3 characters.").max(32, "Keep it under 32 characters."),
  bio: z.string().trim().max(600, "Keep your bio under 600 characters."),
  payoutMethod: z.string(),
  payoutDetails: z.string().trim().max(500, "Keep payout details under 500 characters."),
});

export async function saveStoreProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const { profile } = await requireSeller();
    const parsed = storeProfileSchema.safeParse({
      displayName: text(fd, "displayName"),
      bio: text(fd, "bio"),
      payoutMethod: text(fd, "payoutMethod"),
      payoutDetails: text(fd, "payoutDetails"),
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.", zodFieldErrors(parsed.error));
    const d = parsed.data;
    if (d.payoutMethod && !PAYOUT_METHODS.some((m) => m.id === d.payoutMethod)) {
      return fail("Choose a payout method from the list.", { payoutMethod: "Choose a payout method from the list." });
    }
    const avatar = fd.getAll("avatar").map(String).find(allowedImage) ?? null;
    await db.sellerProfile.update({
      where: { id: profile.id },
      data: {
        displayName: d.displayName,
        bio: d.bio || null,
        avatarUrl: avatar,
        payoutMethod: d.payoutMethod || null,
        payoutDetails: d.payoutDetails || null,
      },
    });
    revalidatePath("/seller/profile");
    revalidatePath(sellerUrl(profile.slug));
    invalidate("listings");
    return ok("Store profile saved.");
  });
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, guard, ok, type ActionState } from "@/lib/action";
import { parseConfig, type CalculatorKind } from "@/lib/boosting/engine";
import { CATEGORY_ORDER } from "@/lib/catalog";
import { slugify } from "@/lib/utils";
import { db } from "@/server/db";
import { invalidate } from "@/server/memo";
import { audit } from "@/server/notify";
import { requireAdmin } from "@/server/session";

// Top-level paths that a game slug must never shadow.
const RESERVED = new Set([
  "games", "accounts", "currency", "items", "top-ups", "gift-cards", "boosting", "admin", "seller", "sellers", "sell",
  "dashboard", "orders", "checkout", "login", "register", "forgot-password", "reset-password", "verify-email", "support",
  "faq", "about", "terms", "privacy", "refund-policy", "blog", "api", "uploads", "sitemap.xml", "robots.txt", "search",
]);

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);

function refreshCatalog() {
  invalidate("games");
  invalidate("services:");
  invalidate("listings");
  revalidatePath("/", "layout");
}

const gameSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name the game.").max(60),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is too short.")
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes.")
    .refine((s) => !RESERVED.has(s), "This slug is reserved by a site page."),
  shortName: z.string().trim().max(8, "Keep the short name to 8 characters.").optional(),
  publisher: z.string().trim().max(60).optional(),
  description: z.string().trim().max(600).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a color."),
  imageUrl: z.string().trim().max(500).optional(),
  currencyName: z.string().trim().max(30).optional(),
  topupName: z.string().trim().max(30).optional(),
  sortOrder: z.coerce.number().int().min(0).max(100000),
  seoTitle: z.string().trim().max(80).optional(),
  seoDescription: z.string().trim().max(200).optional(),
});

export async function saveGameAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const res = await guard(async () => {
    const admin = await requireAdmin();
    const name = String(fd.get("name") ?? "");
    const parsed = gameSchema.safeParse({
      id: (fd.get("id") as string) || undefined,
      name,
      slug: String(fd.get("slug") ?? "").trim() || slugify(name),
      shortName: (fd.get("shortName") as string) || undefined,
      publisher: (fd.get("publisher") as string) || undefined,
      description: (fd.get("description") as string) || undefined,
      color: fd.get("color"),
      imageUrl: (fd.get("imageUrl") as string) || undefined,
      currencyName: (fd.get("currencyName") as string) || undefined,
      topupName: (fd.get("topupName") as string) || undefined,
      sortOrder: fd.get("sortOrder") || 100,
      seoTitle: (fd.get("seoTitle") as string) || undefined,
      seoDescription: (fd.get("seoDescription") as string) || undefined,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
      return fail(parsed.error.issues[0].message, fieldErrors);
    }
    const g = parsed.data;
    const categories = fd.getAll("categories").map(String).filter((c) => (CATEGORY_ORDER as string[]).includes(c)) as (typeof CATEGORY_ORDER)[number][];
    const clash = await db.game.findUnique({ where: { slug: g.slug }, select: { id: true } });
    if (clash && clash.id !== g.id) return fail("Another game already uses this slug.", { slug: "Another game already uses this slug." });

    const data = {
      name: g.name,
      slug: g.slug,
      shortName: g.shortName ?? null,
      publisher: g.publisher ?? null,
      description: g.description ?? null,
      color: g.color.toLowerCase(),
      imageUrl: g.imageUrl ?? null,
      categories,
      currencyName: g.currencyName ?? null,
      topupName: g.topupName ?? null,
      platforms: list(fd.get("platforms")),
      servers: list(fd.get("servers")),
      isActive: fd.get("isActive") === "on",
      isFeatured: fd.get("isFeatured") === "on",
      boostingEnabled: fd.get("boostingEnabled") === "on",
      sortOrder: g.sortOrder,
      seoTitle: g.seoTitle ?? null,
      seoDescription: g.seoDescription ?? null,
    };
    if (g.id) {
      await db.game.update({ where: { id: g.id }, data });
      await audit(admin.id, "game.update", "Game", g.id, { slug: g.slug });
    } else {
      const created = await db.game.create({ data });
      createdId = created.id;
      await audit(admin.id, "game.create", "Game", created.id, { slug: g.slug });
    }
    refreshCatalog();
    revalidatePath("/admin/games");
    return ok("Game saved.");
  });
  if (createdId) redirect(`/admin/games/${createdId}`);
  return res;
}

const faqSchema = z.array(z.object({ q: z.string().trim().min(1), a: z.string().trim().min(1) })).max(30);

const serviceSchema = z.object({
  id: z.string().optional(),
  gameId: z.string().min(1, "Choose a game."),
  name: z.string().trim().min(2, "Name the service.").max(60),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes."),
  tagline: z.string().trim().max(140).optional(),
  description: z.string().max(20000).optional(),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .regex(/^(\/|https:\/\/)\S+$/, "Upload the image or use an https:// address.")
    .optional(),
  calculator: z.enum(["RANK", "WINS", "LEVEL", "HOURS", "FIXED"]),
  sortOrder: z.coerce.number().int().min(0).max(100000),
  seoTitle: z.string().trim().max(80).optional(),
  seoDescription: z.string().trim().max(200).optional(),
});

function issuesText(error: z.ZodError) {
  return error.issues
    .slice(0, 6)
    .map((i) => `${i.path.length ? i.path.join(".") : "config"}: ${i.message}`)
    .join("\n");
}

export async function saveServiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const res = await guard(async () => {
    const admin = await requireAdmin();
    const name = String(fd.get("name") ?? "");
    const parsed = serviceSchema.safeParse({
      id: (fd.get("id") as string) || undefined,
      gameId: fd.get("gameId"),
      name,
      slug: String(fd.get("slug") ?? "").trim() || slugify(name),
      tagline: (fd.get("tagline") as string) || undefined,
      description: (fd.get("description") as string) || undefined,
      imageUrl: (fd.get("imageUrl") as string) || undefined,
      calculator: fd.get("calculator"),
      sortOrder: fd.get("sortOrder") || 100,
      seoTitle: (fd.get("seoTitle") as string) || undefined,
      seoDescription: (fd.get("seoDescription") as string) || undefined,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
      return fail(parsed.error.issues[0].message, fieldErrors);
    }
    const s = parsed.data;

    let configRaw: unknown;
    try {
      configRaw = JSON.parse(String(fd.get("config") ?? ""));
    } catch {
      return fail("The pricing config isn't valid JSON.", { config: "Not valid JSON. Check for missing commas or quotes." });
    }
    const config = parseConfig(s.calculator as CalculatorKind, configRaw);
    if (!config.success) {
      return fail("The pricing config doesn't match the calculator.", { config: issuesText(config.error) });
    }

    let faqRaw: unknown = [];
    const faqText = String(fd.get("faq") ?? "").trim();
    if (faqText) {
      try {
        faqRaw = JSON.parse(faqText);
      } catch {
        return fail("The FAQ isn't valid JSON.", { faq: "Not valid JSON." });
      }
    }
    const faq = faqSchema.safeParse(faqRaw);
    if (!faq.success) return fail("Each FAQ entry needs a question (q) and an answer (a).", { faq: issuesText(faq.error) });

    const game = await db.game.findUnique({ where: { id: s.gameId }, select: { id: true, boostingEnabled: true } });
    if (!game) return fail("Choose a game.", { gameId: "Choose a game." });
    const clash = await db.boostService.findUnique({ where: { gameId_slug: { gameId: s.gameId, slug: s.slug } }, select: { id: true } });
    if (clash && clash.id !== s.id) return fail("This game already has a service with that slug.", { slug: "Already used for this game." });

    const data = {
      gameId: s.gameId,
      name: s.name,
      slug: s.slug,
      tagline: s.tagline ?? null,
      description: s.description ?? null,
      imageUrl: s.imageUrl ?? null,
      calculator: s.calculator,
      config: config.data as never,
      faq: faq.data as never,
      isActive: fd.get("isActive") === "on",
      sortOrder: s.sortOrder,
      seoTitle: s.seoTitle ?? null,
      seoDescription: s.seoDescription ?? null,
    };
    if (s.id) {
      await db.boostService.update({ where: { id: s.id }, data });
      await audit(admin.id, "service.update", "BoostService", s.id, { slug: s.slug });
    } else {
      const created = await db.boostService.create({ data });
      createdId = created.id;
      await audit(admin.id, "service.create", "BoostService", created.id, { slug: s.slug });
    }
    if (fd.get("enableBoosting") === "on" && !game.boostingEnabled) {
      await db.game.update({ where: { id: game.id }, data: { boostingEnabled: true } });
      await audit(admin.id, "game.enable_boosting", "Game", game.id);
    }
    refreshCatalog();
    revalidatePath("/admin/services");
    return ok("Service saved. Prices update on the site right away.");
  });
  if (createdId) redirect(`/admin/services/${createdId}`);
  return res;
}

export async function deleteServiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const admin = await requireAdmin();
    const id = z.string().min(1).parse(fd.get("id"));
    const service = await db.boostService.findUnique({ where: { id }, select: { slug: true, _count: { select: { orders: true } } } });
    if (!service) return fail("Service not found.");
    await db.boostService.delete({ where: { id } });
    await audit(admin.id, "service.delete", "BoostService", id, { slug: service.slug, orders: service._count.orders });
    refreshCatalog();
    return ok("Service deleted.");
  });
  if (res?.ok) redirect("/admin/services");
  return res;
}

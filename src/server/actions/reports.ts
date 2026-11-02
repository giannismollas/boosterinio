"use server";

import { z } from "zod";
import { REPORT_REASONS } from "@/lib/catalog";
import { fail, ok, type ActionState } from "@/lib/action";
import { db } from "@/server/db";
import { audit } from "@/server/notify";
import { getCurrentUser } from "@/server/session";

const schema = z.object({
  listingId: z.string().min(1),
  reason: z.enum(REPORT_REASONS as [string, ...string[]]),
  details: z.string().trim().max(1000).optional(),
});

export async function reportListingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to report a listing.");
  const parsed = schema.safeParse({ listingId: fd.get("listingId"), reason: fd.get("reason"), details: fd.get("details") || undefined });
  if (!parsed.success) return fail("Choose a reason for your report.");

  const recent = await db.report.count({ where: { reporterId: user.id, createdAt: { gte: new Date(Date.now() - 24 * 3600_000) } } });
  if (recent >= 10) return fail("You've sent a lot of reports today. Our team is reviewing them.");

  const listing = await db.listing.findUnique({ where: { id: parsed.data.listingId }, select: { id: true, sellerId: true } });
  if (!listing) return fail("Listing not found.");
  const dup = await db.report.findFirst({ where: { reporterId: user.id, listingId: listing.id, status: "OPEN" } });
  if (dup) return ok("You already reported this listing. We're on it.");

  const report = await db.report.create({
    data: { reporterId: user.id, listingId: listing.id, sellerId: listing.sellerId, reason: parsed.data.reason, details: parsed.data.details },
  });
  await audit(user.id, "report.create", "Report", report.id, { listingId: listing.id });
  return ok("Thanks. Our team will review this listing.");
}

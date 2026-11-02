"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, guard, ok, type ActionState } from "@/lib/action";
import { parseMoney } from "@/lib/utils";
import { audit } from "@/server/notify";
import { requireAdmin } from "@/server/session";
import { saveSettings } from "@/server/settings";

const schema = z.object({
  marketplaceFeePct: z.coerce.number().min(0, "The fee can't be negative.").max(50, "Keep the marketplace fee at 50% or less."),
  boosterPayoutPct: z.coerce.number().min(10, "Boosters need at least 10%.").max(100, "Boosters can get at most 100%."),
  autoCompleteHours: z.coerce.number().int("Use whole hours.").min(1).max(720, "Use at most 720 hours (30 days)."),
  announcement: z.string().trim().max(300, "Keep the announcement under 300 characters."),
  supportHours: z.string().trim().max(100),
});

export async function saveSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const parsed = schema.safeParse({
      marketplaceFeePct: fd.get("marketplaceFeePct"),
      boosterPayoutPct: fd.get("boosterPayoutPct"),
      autoCompleteHours: fd.get("autoCompleteHours"),
      announcement: fd.get("announcement") ?? "",
      supportHours: fd.get("supportHours") ?? "",
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
      return fail(parsed.error.issues[0].message, fieldErrors);
    }
    const minPayoutCents = parseMoney(String(fd.get("minPayout") ?? ""));
    if (minPayoutCents === null || minPayoutCents < 100) return fail("Set a minimum payout of at least 1.00.", { minPayout: "At least 1.00." });

    const patch = { ...parsed.data, minPayoutCents, requireListingApproval: fd.get("requireListingApproval") === "on" };
    await saveSettings(patch);
    await audit(admin.id, "settings.update", "Setting", null, patch);
    revalidatePath("/", "layout");
    return ok("Settings saved.");
  });
}

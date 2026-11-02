"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, guard, ok, type ActionState } from "@/lib/action";
import { db } from "@/server/db";
import { audit } from "@/server/notify";
import { requireStaff } from "@/server/session";

export async function closeReportAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const input = z
      .object({
        id: z.string().min(1),
        status: z.enum(["RESOLVED", "DISMISSED", "OPEN"]),
        staffNote: z.string().trim().max(500).default(""),
      })
      .parse({ id: fd.get("id"), status: fd.get("status"), staffNote: fd.get("staffNote") ?? "" });
    const report = await db.report.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!report) return fail("Report not found.");
    await db.report.update({
      where: { id: input.id },
      data: {
        status: input.status,
        staffNote: input.staffNote || null,
        resolvedAt: input.status === "OPEN" ? null : new Date(),
      },
    });
    await audit(staff.id, `report.${input.status.toLowerCase()}`, "Report", input.id, input.staffNote ? { note: input.staffNote } : undefined);
    revalidatePath("/admin", "layout");
    return ok(input.status === "RESOLVED" ? "Report resolved." : input.status === "DISMISSED" ? "Report dismissed." : "Report reopened.");
  });
}

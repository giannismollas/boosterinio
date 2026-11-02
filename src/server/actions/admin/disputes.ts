"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, guard, ok, type ActionState } from "@/lib/action";
import { db } from "@/server/db";
import { OrderError, resolveDispute } from "@/server/orders";
import { refundPayment, type ProviderId } from "@/server/payments";
import { requireStaff } from "@/server/session";

const schema = z.object({
  id: z.string().min(1),
  outcome: z.enum(["refund", "release", "reopen"], { message: "Choose how to resolve the dispute." }),
  note: z.string().trim().max(1000).default(""),
});

export async function resolveDisputeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const input = schema.parse({ id: fd.get("id"), outcome: fd.get("outcome"), note: fd.get("note") ?? "" });
    const dispute = await db.dispute.findUnique({ where: { id: input.id }, include: { order: true } });
    if (!dispute) return fail("Dispute not found.");
    if (dispute.status !== "OPEN") return fail("This dispute is already resolved.");
    if (input.outcome !== "reopen" && !input.note) return fail("Add a note explaining the decision. The buyer and seller will see it.");

    let note = input.note;
    if (input.outcome === "refund") {
      try {
        const res = await refundPayment({
          paymentProvider: dispute.order.paymentProvider as ProviderId | null,
          paymentIntent: dispute.order.paymentIntent,
        });
        if (!res.ok) return fail(res.error);
        if (res.manual) note = `${note} Crypto refund will be sent manually.`.trim();
      } catch (err) {
        console.error("[admin.dispute.refund]", err);
        return fail(`The payment provider refused the refund: ${(err as Error).message ?? "unknown error"}`);
      }
    }
    await resolveDispute(dispute.id, staff.id, input.outcome, note);

    revalidatePath("/admin", "layout");
    revalidatePath(`/admin/disputes/${dispute.id}`);
    revalidatePath(`/admin/orders/${dispute.orderId}`);
    revalidatePath(`/orders/${dispute.order.number}`);
    return ok(
      input.outcome === "refund" ? "Buyer refunded and dispute closed." : input.outcome === "release" ? "Payment released to the seller." : "Dispute closed and order resumed.",
    );
  }, [OrderError]);
}

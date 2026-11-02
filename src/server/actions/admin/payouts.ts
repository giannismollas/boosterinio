"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guard, ok, type ActionState } from "@/lib/action";
import { requireStaff } from "@/server/session";
import { markPayoutPaid, rejectPayout, WalletError } from "@/server/wallet";

export async function payoutPaidAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const input = z
      .object({ id: z.string().min(1), reference: z.string().trim().max(200).default(""), note: z.string().trim().max(500).default("") })
      .parse({ id: fd.get("id"), reference: fd.get("reference") ?? "", note: fd.get("note") ?? "" });
    await markPayoutPaid(input.id, staff.id, input.reference || null, input.note || null);
    revalidatePath("/admin", "layout");
    revalidatePath("/seller/wallet");
    return ok("Payout marked as paid. The seller was notified.");
  }, [WalletError]);
}

export async function payoutRejectAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const staff = await requireStaff();
    const input = z
      .object({ id: z.string().min(1), note: z.string().trim().min(3, "Tell the seller why the payout was declined.").max(500) })
      .parse({ id: fd.get("id"), note: fd.get("note") ?? "" });
    await rejectPayout(input.id, staff.id, input.note);
    revalidatePath("/admin", "layout");
    revalidatePath("/seller/wallet");
    return ok("Payout declined. The amount went back to the seller's balance.");
  }, [WalletError]);
}

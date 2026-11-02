"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { fail, ok, type ActionState } from "@/lib/action";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("/dashboard/settings");
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Use at least 2 characters.").max(40),
      image: z.string().max(500).optional(),
    })
    .safeParse({ name: fd.get("name"), image: fd.getAll("avatar").map(String)[0] || undefined });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const image = parsed.data.image && (parsed.data.image.startsWith("/uploads/") || parsed.data.image.startsWith("https://")) ? parsed.data.image : null;
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name, image } });
  revalidatePath("/", "layout");
  return ok("Profile saved.");
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("/dashboard/settings");
  const parsed = z
    .object({ current: z.string().min(1, "Enter your current password."), next: z.string().min(8, "Use at least 8 characters.").max(128) })
    .safeParse({ current: fd.get("current"), next: fd.get("next") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  try {
    await auth.api.changePassword({
      body: { currentPassword: parsed.data.current, newPassword: parsed.data.next, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch (err) {
    const code = (err as { body?: { code?: string } })?.body?.code;
    if (code === "INVALID_PASSWORD") return fail("Your current password is wrong.");
    if (code === "CREDENTIAL_ACCOUNT_NOT_FOUND") return fail("You signed up with Discord or Google, so there's no password to change.");
    return fail("Couldn't change your password. Try again.");
  }
  return ok("Password changed. Other devices were signed out.");
}

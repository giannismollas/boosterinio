"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, ok, type ActionState } from "@/lib/action";
import { auth, enabledSocialProviders } from "@/server/auth";

function safeNext(value: FormDataEntryValue | null, fallback = "/dashboard") {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/api/") ? s : fallback;
}

function authMessage(err: unknown) {
  const e = err as { body?: { message?: string; code?: string }; message?: string; status?: number | string };
  const code = e?.body?.code ?? "";
  if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") return "An account with this email already exists. Sign in instead.";
  if (code === "INVALID_EMAIL_OR_PASSWORD") return "That email and password don't match.";
  if (code === "EMAIL_NOT_VERIFIED") return "Confirm your email first. We've sent you a new link.";
  if (code === "PASSWORD_TOO_SHORT") return "Use at least 8 characters for your password.";
  if (code === "INVALID_TOKEN") return "This reset link has expired. Request a new one.";
  return e?.body?.message || "Something went wrong. Please try again.";
}

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Pick a name with at least 2 characters.").max(40, "Keep your name under 40 characters."),
  email: z.email("Enter a valid email address.").transform((s) => s.toLowerCase()),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
  terms: z.literal("on", { message: "Accept the terms to create an account." }),
});

export async function signUpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    name: fd.get("name"),
    email: fd.get("email"),
    password: fd.get("password"),
    terms: fd.get("terms"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return fail(parsed.error.issues[0].message, fieldErrors);
  }
  try {
    await auth.api.signUpEmail({ body: parsed.data, headers: await headers() });
  } catch (err) {
    return fail(authMessage(err));
  }
  if (process.env.REQUIRE_EMAIL_VERIFICATION === "true") redirect("/login?check-email=1");
  redirect(safeNext(fd.get("next")));
}

export async function signInAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = z
    .object({ email: z.email("Enter a valid email address."), password: z.string().min(1, "Enter your password.") })
    .safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  try {
    await auth.api.signInEmail({
      body: { email: parsed.data.email.toLowerCase(), password: parsed.data.password, rememberMe: true },
      headers: await headers(),
    });
  } catch (err) {
    return fail(authMessage(err));
  }
  redirect(safeNext(fd.get("next")));
}

export async function socialSignInAction(fd: FormData) {
  const provider = fd.get("provider");
  if (provider !== "discord" && provider !== "google") return;
  if (!enabledSocialProviders.includes(provider)) return;
  const res = await auth.api.signInSocial({
    body: { provider, callbackURL: safeNext(fd.get("next")) },
    headers: await headers(),
  });
  if (res?.url) redirect(res.url);
}

export async function signOutAction() {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // already signed out
  }
  redirect("/");
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = z.email().safeParse(fd.get("email"));
  if (!email.success) return fail("Enter a valid email address.");
  try {
    await auth.api.requestPasswordReset({ body: { email: email.data.toLowerCase(), redirectTo: "/reset-password" } });
  } catch (err) {
    console.error("[auth] reset request", err);
  }
  // Same answer whether or not the account exists.
  return ok("If that email has an account, a reset link is on its way.");
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = z
    .object({ token: z.string().min(1), password: z.string().min(8, "Use at least 8 characters.").max(128) })
    .safeParse({ token: fd.get("token"), password: fd.get("password") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  try {
    await auth.api.resetPassword({ body: { newPassword: parsed.data.password, token: parsed.data.token } });
  } catch (err) {
    return fail(authMessage(err));
  }
  redirect("/login?reset=1");
}

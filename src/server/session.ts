import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { db } from "./db";

export const getSession = cache(async () => {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
});

/** The signed-in user with their seller profile, or null. Banned users count as signed out. */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { sellerProfile: true },
  });
  if (!user || user.banned) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function isStaff(user: { role: string } | null | undefined) {
  return user?.role === "ADMIN" || user?.role === "SUPPORT";
}

export function isAdmin(user: { role: string } | null | undefined) {
  return user?.role === "ADMIN";
}

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

/** Support agents and admins. */
export async function requireStaff(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!isStaff(user)) notFound();
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!isAdmin(user)) notFound();
  return user;
}

/**
 * An approved seller/booster. `kind` narrows to people allowed to list items
 * ("sell") or claim boosting orders ("boost").
 */
export async function requireSeller(kind?: "sell" | "boost") {
  const user = await requireUser("/seller");
  const profile = user.sellerProfile;
  if (!profile || profile.status !== "APPROVED") redirect("/sell");
  if (kind === "sell" && !profile.canSell) redirect("/seller");
  if (kind === "boost" && !profile.canBoost) redirect("/seller");
  return { user, profile };
}

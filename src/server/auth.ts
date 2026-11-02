import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { site } from "@/lib/site";
import { db } from "./db";
import { sendEmail } from "./email";

const discord =
  process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
    ? { discord: { clientId: process.env.DISCORD_CLIENT_ID, clientSecret: process.env.DISCORD_CLIENT_SECRET } }
    : {};
const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
    : {};

export const enabledSocialProviders = [...Object.keys(discord), ...Object.keys(google)] as ("discord" | "google")[];

export const auth = betterAuth({
  appName: site.name,
  baseURL: process.env.BETTER_AUTH_URL || site.url,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  trustedOrigins: [site.url],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: `Reset your ${site.name} password`,
        heading: "Reset your password",
        body: `Someone asked to reset the password for ${user.email}. If it was you, use the button below. The link works for one hour.\n\nIf it wasn't you, ignore this email.`,
        cta: { label: "Choose a new password", url },
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: `Confirm your ${site.name} email`,
        heading: `Welcome to ${site.name}`,
        body: "Confirm your email address so we can send you order updates and keep your account secure.",
        cta: { label: "Confirm email", url },
      });
    },
  },
  socialProviders: { ...discord, ...google },
  user: {
    additionalFields: {
      // Exposed on the session so the header can show staff links; never settable by users.
      role: { type: "string", input: false, defaultValue: "USER" },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    window: 60,
    max: 60,
  },
  advanced: {
    cookiePrefix: "bst",
  },
  plugins: [nextCookies()],
});

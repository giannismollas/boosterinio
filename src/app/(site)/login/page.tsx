import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell, SocialButtons } from "@/components/auth-shell";
import { SignInForm } from "@/components/auth-forms";
import { str } from "@/lib/utils";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: true } };

function safeNext(v: string) {
  return v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(str(sp.next));
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthShell
      title="Player login"
      intro={
        str(sp["check-email"]) === "1"
          ? "Check your inbox: we sent a link to confirm your email. Then sign in here."
          : str(sp.reset) === "1"
            ? "Password updated. Sign in with your new password."
            : "Sign in to track orders, chat with your booster and manage your shop."
      }
      footer={
        <>
          New here?{" "}
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-phosphor hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <SignInForm next={next} />
      <SocialButtons next={next} />
    </AuthShell>
  );
}

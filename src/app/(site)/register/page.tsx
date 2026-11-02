import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell, SocialButtons } from "@/components/auth-shell";
import { SignUpForm } from "@/components/auth-forms";
import { pageMeta } from "@/lib/seo";
import { str } from "@/lib/utils";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = pageMeta({
  title: "Create an account",
  description: "Create a free Boosterinio account to buy boosting and game goods with escrow protection, or to apply as a seller or booster.",
  path: "/register",
});

function safeNext(v: string) {
  return v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard";
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = safeNext(str((await searchParams).next));
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthShell
      title="New player"
      intro="One account for buying, selling and boosting. Free, and it takes a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-phosphor hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm next={next} />
      <SocialButtons next={next} />
    </AuthShell>
  );
}

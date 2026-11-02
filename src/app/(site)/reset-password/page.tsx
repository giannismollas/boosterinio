import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "@/components/auth-forms";
import { str } from "@/lib/utils";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const token = str(sp.token);
  const invalid = !token || str(sp.error) !== "";
  return (
    <AuthShell
      title="New password"
      intro={invalid ? "This reset link is invalid or has expired." : "Choose a new password with at least 8 characters."}
      footer={
        <Link href={invalid ? "/forgot-password" : "/login"} className="text-phosphor hover:underline">
          {invalid ? "Request a new link" : "Back to sign in"}
        </Link>
      }
    >
      {invalid ? null : <ResetForm token={token} />}
    </AuthShell>
  );
}

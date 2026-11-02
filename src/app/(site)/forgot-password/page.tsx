import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ForgotForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: true } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Lost your key?"
      intro="Enter your account email and we'll send you a link to choose a new password."
      footer={
        <Link href="/login" className="text-phosphor hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}

"use client";

import Link from "next/link";
import { forgotPasswordAction, resetPasswordAction, signInAction, signUpAction } from "@/server/actions/auth";
import { ActionForm, FieldError, SubmitButton } from "./forms";

export function SignInForm({ next }: { next: string }) {
  return (
    <ActionForm action={signInAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="label">
            Password
          </label>
          <Link href="/forgot-password" className="text-[0.8125rem] text-phosphor hover:underline">
            Forgot it?
          </Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      <SubmitButton className="btn-coin btn-lg w-full" pendingText="Signing in…">
        Press start · Sign in
      </SubmitButton>
    </ActionForm>
  );
}

export function SignUpForm({ next }: { next: string }) {
  return (
    <ActionForm action={signUpAction} className="space-y-4">
      {(state) => (
        <>
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="name" className="label">
              Display name
            </label>
            <input id="name" name="name" autoComplete="nickname" required minLength={2} maxLength={40} className="field" aria-invalid={!!state?.fieldErrors?.name} />
            <FieldError state={state} name="name" />
          </div>
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input id="email" name="email" type="email" autoComplete="email" required className="field" aria-invalid={!!state?.fieldErrors?.email} />
            <FieldError state={state} name="email" />
          </div>
          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="field"
              aria-invalid={!!state?.fieldErrors?.password}
            />
            <FieldError state={state} name="password" />
            {!state?.fieldErrors?.password ? <p className="mt-1.5 text-[0.8125rem] text-ink-3">At least 8 characters.</p> : null}
          </div>
          <label className="flex items-start gap-3 text-sm text-ink-2">
            <input type="checkbox" name="terms" required className="mt-0.5 size-4 shrink-0 accent-[#ff2e88]" />
            <span>
              I&apos;m 18 or older (or have permission from a parent) and agree to the{" "}
              <Link href="/terms" className="text-phosphor hover:underline" target="_blank">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-phosphor hover:underline" target="_blank">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          <FieldError state={state} name="terms" />
          <SubmitButton className="btn-coin btn-lg w-full" pendingText="Creating account…">
            Press start · Create account
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ForgotForm() {
  return (
    <ActionForm action={forgotPasswordAction} className="space-y-4" resetOnSuccess>
      {(state) =>
        state?.ok ? (
          <p className="rounded-[12px] border border-ok/30 bg-ok/5 px-4 py-3 text-sm text-ok">{state.message}</p>
        ) : (
          <>
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input id="email" name="email" type="email" autoComplete="email" required className="field" />
            </div>
            <SubmitButton className="btn-coin btn-lg w-full" pendingText="Sending…">
              Send reset link
            </SubmitButton>
          </>
        )
      }
    </ActionForm>
  );
}

export function ResetForm({ token }: { token: string }) {
  return (
    <ActionForm action={resetPasswordAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="label">
          New password
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="field" />
      </div>
      <SubmitButton className="btn-coin btn-lg w-full" pendingText="Saving…">
        Save new password
      </SubmitButton>
    </ActionForm>
  );
}

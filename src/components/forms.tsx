"use client";

import { createContext, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/utils";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

const FormStateContext = createContext<ActionState>(null);

/**
 * A form bound to a server action with toast feedback. Children can be a
 * function receiving the action state (for inline field errors).
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  toastSuccess = true,
  id,
}: {
  action: FormAction;
  children: ReactNode | ((state: ActionState) => ReactNode);
  className?: string;
  resetOnSuccess?: boolean;
  toastSuccess?: boolean;
  id?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      if (state.message && toastSuccess) toast.success(state.message);
      if (resetOnSuccess) ref.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, resetOnSuccess, toastSuccess]);

  return (
    <form ref={ref} action={formAction} className={className} id={id} noValidate={false}>
      <FormStateContext.Provider value={state}>{typeof children === "function" ? children(state) : children}</FormStateContext.Provider>
    </form>
  );
}

export function SubmitButton({
  children,
  className,
  pendingText,
  name,
  value,
  disabled,
  formAction,
}: {
  children: ReactNode;
  className?: string;
  pendingText?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
  formAction?: (formData: FormData) => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      formAction={formAction}
      disabled={pending || disabled}
      aria-busy={pending}
      className={cn("btn", className)}
    >
      {pending ? (pendingText ?? "Working…") : children}
    </button>
  );
}

/**
 * Inline error for a field. Reads the surrounding ActionForm's state, so it
 * also works inside forms rendered by Server Components (pass `state` only
 * when you already have it).
 */
export function FieldError({ state, name }: { state?: ActionState; name: string }) {
  const ctx = useContext(FormStateContext);
  const msg = (state ?? ctx)?.fieldErrors?.[name];
  if (!msg) return null;
  return <p className="mt-1.5 text-[0.8125rem] text-bad">{msg}</p>;
}

/** Confirms before submitting a destructive action. */
export function ConfirmButton({ children, className, message }: { children: ReactNode; className?: string; message: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn("btn", className)}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

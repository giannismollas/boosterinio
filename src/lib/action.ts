import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

/** Result shape every form action returns (used with useActionState). */
export type ActionState = { ok: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> } | null;

export const ok = (message?: string): ActionState => ({ ok: true, message });
export const fail = (error: string, fieldErrors?: Record<string, string>): ActionState => ({ ok: false, error, fieldErrors });

/** Maps a zod error to { field: message } for inline form errors. */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Wraps an action body: known errors become `fail(message)`, redirects pass
 * through, and anything unexpected is logged and shown as a generic error.
 */
export async function guard(fn: () => Promise<ActionState>, known: (new (...args: never[]) => Error)[] = []): Promise<ActionState> {
  try {
    return await fn();
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof z.ZodError) return fail(err.issues[0]?.message ?? "Check the form and try again.", zodFieldErrors(err));
    if (known.some((K) => err instanceof K)) return fail((err as Error).message);
    console.error("[action]", err);
    return fail("Something went wrong. Please try again.");
  }
}

/** Reads FormData into a plain object (repeated keys become arrays). */
export function formObject(fd: FormData) {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    if (k in out) {
      const cur = out[k];
      out[k] = Array.isArray(cur) ? [...cur, v] : [cur, v];
    } else out[k] = v;
  }
  return out;
}

"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="crt w-full max-w-lg p-8 text-center sm:p-10">
        <h1 className="t-display text-5xl text-[#e6fffa] uppercase">Something glitched</h1>
        <p className="mt-3 text-[#b9dcd5]">
          The page hit an error. Try again; if it keeps happening, tell support{error.digest ? ` and mention code ${error.digest}` : ""}.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-coin">
            Try again
          </button>
          <Link href="/support" className="btn btn-ghost">
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}

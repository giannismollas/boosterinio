import type { ReactNode } from "react";
import { socialSignInAction } from "@/server/actions/auth";
import { enabledSocialProviders } from "@/server/auth";
import { LogoMark } from "./brand";

/** The player-login screen: one CRT, centered. */
export function AuthShell({ title, intro, children, footer }: { title: string; intro?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1320px] justify-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-[440px]">
        <div className="crt p-6 sm:p-8">
          <LogoMark className="h-9" />
          <h1 className="t-display mt-5 text-[2.6rem] text-[#ffffff] uppercase">{title}</h1>
          {intro ? <p className="mt-2 text-sm leading-relaxed text-[#c8c3d0]">{intro}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-5 text-center text-sm text-ink-2">{footer}</div> : null}
      </div>
    </div>
  );
}

export function SocialButtons({ next }: { next: string }) {
  if (!enabledSocialProviders.length) return null;
  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-3 text-[0.75rem] text-phosphor-dim">
        <span className="h-px flex-1 bg-phosphor/15" />
        or continue with
        <span className="h-px flex-1 bg-phosphor/15" />
      </div>
      <form action={socialSignInAction} className="grid gap-2 sm:grid-cols-2">
        <input type="hidden" name="next" value={next} />
        {enabledSocialProviders.map((p) => (
          <button key={p} type="submit" name="provider" value={p} className="btn btn-ghost w-full">
            {p === "discord" ? "Discord" : "Google"}
          </button>
        ))}
      </form>
    </div>
  );
}

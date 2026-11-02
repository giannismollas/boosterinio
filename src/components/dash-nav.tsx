"use client";

import {
  Bell,
  Gamepad2,
  LayoutDashboard,
  ListChecks,
  Package,
  Settings,
  ShoppingBag,
  Store,
  Swords,
  Ticket,
  UserRound,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PixelCursor } from "./pixel";

const ICONS = {
  dashboard: LayoutDashboard,
  orders: ShoppingBag,
  tickets: Ticket,
  bell: Bell,
  settings: Settings,
  store: Store,
  listings: Package,
  boosts: Swords,
  wallet: Wallet,
  profile: UserRound,
  games: Gamepad2,
  checklist: ListChecks,
} as const;

export type DashNavItem = { href: string; label: string; icon: keyof typeof ICONS; count?: number; exact?: boolean };

/** Side rail on desktop, scrollable tab strip on mobile. The active item carries the select-screen cursor. */
export function DashNav({ items, title }: { items: DashNavItem[]; title: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={title} className="lg:sticky lg:top-24">
      <p className="mb-3 hidden px-3 font-pixel text-[0.6875rem] text-ink-3 uppercase lg:block">{title}</p>
      <ul className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = ICONS[item.icon];
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-10 items-center gap-2.5 overflow-hidden rounded-[10px] px-3 text-sm transition-colors",
                  active ? "bg-cab-3 text-ink" : "text-ink-2 hover:bg-cab-2 hover:text-ink",
                )}
              >
                <PixelCursor className={cn("absolute left-1 h-2 w-2 text-p1 transition-opacity", active ? "opacity-100" : "opacity-0")} />
                <Icon className={cn("ml-1.5 size-4", active ? "text-phosphor" : "text-ink-3")} />
                <span className="whitespace-nowrap">{item.label}</span>
                {item.count ? (
                  <span className="ml-auto rounded-[6px] bg-p1/15 px-1.5 font-display text-base leading-5 text-p1 tnum">{item.count}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DashShell({ nav, title, children }: { nav: DashNavItem[]; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside>
        <DashNav items={nav} title={title} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

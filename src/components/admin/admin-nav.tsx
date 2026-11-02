"use client";

import {
  Banknote,
  Flag,
  Gamepad2,
  LayoutDashboard,
  Menu,
  Package,
  Percent,
  Scale,
  ScrollText,
  Settings,
  ShoppingBag,
  Star,
  Swords,
  Ticket,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PixelCursor } from "@/components/pixel";
import { cn } from "@/lib/utils";

const ICONS = {
  overview: LayoutDashboard,
  orders: ShoppingBag,
  disputes: Scale,
  tickets: Ticket,
  applications: UserCheck,
  listings: Package,
  reports: Flag,
  payouts: Banknote,
  games: Gamepad2,
  services: Swords,
  coupons: Percent,
  reviews: Star,
  users: Users,
  settings: Settings,
  audit: ScrollText,
} as const;

export type AdminNavItem = { href: string; label: string; icon: keyof typeof ICONS; count?: number };
export type AdminNavGroup = { title?: string; items: AdminNavItem[] };

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ groups, pathname }: { groups: AdminNavGroup[]; pathname: string }) {
  return (
    <div className="space-y-6">
      {groups.map((group, gi) => (
        <div key={group.title ?? gi}>
          {group.title ? <p className="mb-2 px-3 font-pixel text-[0.625rem] text-ink-3 uppercase">{group.title}</p> : null}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = ICONS[item.icon];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-9 items-center gap-2.5 rounded-[9px] pr-2 pl-3 text-sm transition-colors",
                      active ? "bg-cab-3 text-ink" : "text-ink-2 hover:bg-cab-2 hover:text-ink",
                    )}
                  >
                    <PixelCursor className={cn("absolute left-1 h-2 w-2 text-p1 transition-opacity", active ? "opacity-100" : "opacity-0")} />
                    <Icon className={cn("ml-1.5 size-4 shrink-0", active ? "text-phosphor" : "text-ink-3")} />
                    <span className="truncate">{item.label}</span>
                    {item.count ? (
                      <span className="ml-auto min-w-7 rounded-[6px] bg-p1/15 px-1.5 text-center font-display text-[1.0625rem] leading-6 text-p1 tnum">
                        {item.count > 999 ? "999+" : item.count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Admin rail: always open on desktop, a toggled sheet on mobile. */
export function AdminNav({ groups }: { groups: AdminNavGroup[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const total = groups.flatMap((g) => g.items).reduce((n, i) => n + (i.count ?? 0), 0);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <nav aria-label="Admin" className="hidden px-3 pb-8 lg:block">
        <NavList groups={groups} pathname={pathname} />
      </nav>
      <div className="px-4 pb-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          className="btn btn-ghost btn-sm w-full justify-between"
        >
          <span className="inline-flex items-center gap-2">
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
            Menu
          </span>
          {total ? <span className="font-display text-base text-p1 tnum">{total} waiting</span> : null}
        </button>
        {open ? (
          <nav id="admin-mobile-nav" aria-label="Admin" className="mt-3 rounded-[12px] border border-cab-4 bg-cab-2 p-2">
            <NavList groups={groups} pathname={pathname} />
          </nav>
        ) : null}
      </div>
    </>
  );
}

const SECTION_LABELS: Record<string, string> = {
  orders: "Orders",
  disputes: "Disputes",
  tickets: "Tickets",
  applications: "Applications",
  listings: "Listings",
  reports: "Reports",
  payouts: "Payouts",
  games: "Games",
  services: "Services",
  coupons: "Coupons",
  reviews: "Reviews",
  users: "Users",
  settings: "Settings",
  audit: "Audit log",
};

/** Breadcrumb for the admin top bar, derived from the URL. */
export function AdminCrumb() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean).slice(1);
  const section = parts[0];
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
      <Link href="/admin" className={cn("shrink-0", section ? "text-ink-3 hover:text-ink" : "text-ink")}>
        Admin
      </Link>
      {section ? (
        <>
          <span className="text-ink-3" aria-hidden>
            /
          </span>
          <Link href={`/admin/${section}`} className={cn("shrink-0", parts.length > 1 ? "text-ink-3 hover:text-ink" : "text-ink")}>
            {SECTION_LABELS[section] ?? section}
          </Link>
        </>
      ) : null}
      {parts.length > 1 ? (
        <>
          <span className="text-ink-3" aria-hidden>
            /
          </span>
          <span className="truncate text-ink">{parts[1] === "new" ? "New" : "Detail"}</span>
        </>
      ) : null}
    </nav>
  );
}

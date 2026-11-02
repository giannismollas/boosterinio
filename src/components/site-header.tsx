import { Bell, ChevronDown, Heart, LayoutDashboard, LogOut, Menu, Settings, Shield, Store, Ticket, UserRound } from "lucide-react";
import Link from "next/link";
import { signOutAction } from "@/server/actions/auth";
import { db } from "@/server/db";
import { getCurrentUser, isStaff } from "@/server/session";
import { getSettings } from "@/server/settings";
import { Logo } from "./brand";
import { Slash } from "./marks";
import { Avatar } from "./ui";

const NAV = [
  { href: "/league-of-legends/boosting", label: "LoL Boosting" },
  { href: "/accounts", label: "Accounts" },
  { href: "/currency", label: "Currency" },
  { href: "/items", label: "Items" },
  { href: "/top-ups", label: "Top-Ups" },
  { href: "/gift-cards", label: "Gift Cards" },
  { href: "/games", label: "All games" },
];

export async function SiteHeader() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const unread = user ? await db.notification.count({ where: { userId: user.id, readAt: null } }) : 0;

  return (
    <>
      <header className="marquee sticky top-0 z-40">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden max-sm:hidden [--plate-w:405px] xl:[--plate-w:calc(max(1.5rem,(100vw-1320px)/2+1.5rem)+305px)]"
          aria-hidden
        >
          <div className="marquee-plate" />
        </div>
        <div className="relative mx-auto flex h-[70px] max-w-[1320px] items-center gap-3 px-4 sm:gap-4 sm:px-6">
          <details className="group relative xl:hidden">
            <summary className="btn btn-ghost size-10 list-none px-0 [&::-webkit-details-marker]:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </summary>
            <nav className="panel absolute left-0 top-12 z-50 w-64 p-2" aria-label="Main">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="flex h-11 items-center rounded-[9px] px-3 text-ink-2 hover:bg-cab-3 hover:text-ink">
                  {item.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-cab-4" />
              {!user ? (
                <Link href="/login" className="flex h-11 items-center rounded-[9px] px-3 text-ink-2 hover:bg-cab-3 hover:text-ink">
                  Sign in
                </Link>
              ) : null}
              <Link href="/sell" className="flex h-11 items-center rounded-[9px] px-3 text-ink-2 hover:bg-cab-3 hover:text-ink">
                Sell or boost with us
              </Link>
              <Link href="/support" className="flex h-11 items-center rounded-[9px] px-3 text-ink-2 hover:bg-cab-3 hover:text-ink">
                Support
              </Link>
            </nav>
          </details>

          <Logo className="shrink-0" />

          <nav className="ml-10 hidden items-center gap-0.5 xl:flex" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group/nav relative inline-flex h-9 items-center rounded-[8px] px-2.5 text-[0.9375rem] font-medium whitespace-nowrap text-ink-2 transition-colors hover:text-ink"
              >
                <Slash className="absolute top-1/2 left-0 h-3 w-1.5 -translate-x-1 -translate-y-1/2 text-p1 opacity-0 transition-all duration-150 group-hover/nav:translate-x-0 group-hover/nav:opacity-100" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {user ? (
              <>
                <Link href="/dashboard/notifications" className="btn btn-ghost btn-sm relative px-2.5" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
                  <Bell className="size-[18px]" />
                  {unread > 0 ? (
                    <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-[6px] bg-p2 px-1 font-pixel text-[0.625rem] text-white tnum">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  ) : null}
                </Link>
                <details className="relative">
                  <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-[10px] px-1 hover:bg-cab-3 sm:px-1.5 [&::-webkit-details-marker]:hidden" aria-label="Account menu">
                    <Avatar name={user.name} src={user.image} size={30} />
                    <span className="hidden max-w-32 truncate text-sm font-medium sm:block">{user.name}</span>
                    <ChevronDown className="hidden size-4 text-ink-3 sm:block" />
                  </summary>
                  <div className="panel absolute right-0 top-12 z-50 w-60 p-2">
                    <p className="truncate px-3 pt-1 pb-2 text-xs text-ink-3">{user.email}</p>
                    <MenuLink href="/dashboard" icon={<LayoutDashboard className="size-4" />}>
                      My orders
                    </MenuLink>
                    <MenuLink href="/dashboard/tickets" icon={<Ticket className="size-4" />}>
                      Support tickets
                    </MenuLink>
                    <MenuLink href="/dashboard/following" icon={<Heart className="size-4" />}>
                      Following
                    </MenuLink>
                    <MenuLink href={user.sellerProfile?.status === "APPROVED" ? "/seller" : "/sell"} icon={<Store className="size-4" />}>
                      {user.sellerProfile?.status === "APPROVED" ? "Seller dashboard" : "Sell or boost"}
                    </MenuLink>
                    <MenuLink href="/dashboard/settings" icon={<Settings className="size-4" />}>
                      Settings
                    </MenuLink>
                    {isStaff(user) ? (
                      <MenuLink href="/admin" icon={<Shield className="size-4" />}>
                        Admin panel
                      </MenuLink>
                    ) : null}
                    <div className="my-1.5 h-px bg-cab-4" />
                    <form action={signOutAction}>
                      <button type="submit" className="flex h-10 w-full items-center gap-2.5 rounded-[9px] px-3 text-left text-sm text-ink-2 hover:bg-cab-3 hover:text-ink">
                        <LogOut className="size-4" />
                        Sign out
                      </button>
                    </form>
                  </div>
                </details>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden h-10 items-center px-3 text-sm font-medium whitespace-nowrap text-ink-2 hover:text-ink sm:inline-flex">
                  Sign in
                </Link>
                <Link href="/register" className="btn btn-p1 btn-sm max-sm:size-10 max-sm:px-0" aria-label="Create account">
                  <UserRound className="size-4" aria-hidden />
                  <span className="max-sm:hidden">Create account</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      {settings.announcement ? (
        <div className="border-b border-cab-4 bg-cab-2">
          <p className="mx-auto max-w-[1320px] px-4 py-2 text-center text-sm text-ink-2 sm:px-6">{settings.announcement}</p>
        </div>
      ) : null}
    </>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex h-10 items-center gap-2.5 rounded-[9px] px-3 text-sm text-ink-2 hover:bg-cab-3 hover:text-ink">
      {icon}
      {children}
    </Link>
  );
}

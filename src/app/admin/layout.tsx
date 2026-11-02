import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminCrumb, AdminNav, type AdminNavGroup } from "@/components/admin/admin-nav";
import { LogoMark } from "@/components/brand";
import { Avatar } from "@/components/ui";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = {
  title: { template: "%s · Admin", default: "Admin" },
  robots: { index: false, follow: false },
};

async function queueCounts() {
  const [applications, listings, tickets, disputes, payouts, boosts, reports] = await Promise.all([
    db.sellerProfile.count({ where: { status: "PENDING" } }),
    db.listing.count({ where: { status: "PENDING" } }),
    db.ticket.count({ where: { status: "OPEN" } }),
    db.dispute.count({ where: { status: "OPEN" } }),
    db.payout.count({ where: { status: "REQUESTED" } }),
    db.order.count({ where: { type: "BOOST", status: "PAID", boosterId: null } }),
    db.report.count({ where: { status: "OPEN" } }),
  ]);
  return { applications, listings, tickets, disputes, payouts, boosts, reports };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const c = await queueCounts();
  const admin = staff.role === "ADMIN";

  const groups: AdminNavGroup[] = [
    { items: [{ href: "/admin", label: "Overview", icon: "overview" }] },
    {
      title: "Queues",
      items: [
        { href: "/admin/orders", label: "Orders", icon: "orders", count: c.boosts },
        { href: "/admin/disputes", label: "Disputes", icon: "disputes", count: c.disputes },
        { href: "/admin/tickets", label: "Tickets", icon: "tickets", count: c.tickets },
        { href: "/admin/applications", label: "Applications", icon: "applications", count: c.applications },
        { href: "/admin/listings", label: "Listings", icon: "listings", count: c.listings },
        { href: "/admin/reports", label: "Reports", icon: "reports", count: c.reports },
        { href: "/admin/payouts", label: "Payouts", icon: "payouts", count: c.payouts },
      ],
    },
    {
      title: "Catalog",
      items: [
        { href: "/admin/games", label: "Games", icon: "games" },
        { href: "/admin/services", label: "Services & pricing", icon: "services" },
        { href: "/admin/coupons", label: "Coupons", icon: "coupons" },
        { href: "/admin/reviews", label: "Reviews", icon: "reviews" },
      ],
    },
    {
      title: "System",
      items: [
        { href: "/admin/users", label: "Users", icon: "users" },
        ...(admin ? [{ href: "/admin/settings", label: "Settings", icon: "settings" as const }] : []),
        { href: "/admin/audit", label: "Audit log", icon: "audit" },
      ],
    },
  ];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      <aside className="border-b border-cab-4 bg-[#121110] lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-r lg:border-b-0">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <Link href="/admin" className="flex items-center gap-2.5" aria-label="Admin overview">
            <LogoMark className="h-7" />
            <span className="t-display text-[1.75rem] tracking-[0.04em] text-ink uppercase">Admin</span>
          </Link>
          {admin ? null : <span className="chip chip-plain ml-auto">Support</span>}
        </div>
        <AdminNav groups={groups} />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-cab-4 bg-cab/95 px-4 sm:px-6 lg:px-8">
          <AdminCrumb />
          <div className="ml-auto flex items-center gap-3">
            <Link href="/" className="hidden items-center gap-1.5 text-sm text-ink-2 hover:text-ink sm:inline-flex">
              View site <ExternalLink className="size-3.5" />
            </Link>
            <span className="flex items-center gap-2">
              <Avatar name={staff.name} src={staff.image} size={28} />
              <span className="hidden max-w-40 truncate text-sm text-ink-2 md:block">{staff.name}</span>
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

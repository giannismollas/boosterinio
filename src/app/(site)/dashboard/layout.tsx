import type { Metadata } from "next";
import { DashShell, type DashNavItem } from "@/components/dash-nav";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: { default: "My account", template: "%s · My account" }, robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/dashboard");
  const [answered, unread] = await Promise.all([
    db.ticket.count({ where: { userId: user.id, status: "ANSWERED" } }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  const nav: DashNavItem[] = [
    { href: "/dashboard", label: "My orders", icon: "orders", exact: true },
    { href: "/dashboard/tickets", label: "Support tickets", icon: "tickets", count: answered },
    { href: "/dashboard/notifications", label: "Notifications", icon: "bell", count: unread },
    { href: "/dashboard/following", label: "Following", icon: "following" },
    { href: "/dashboard/settings", label: "Settings", icon: "settings" },
  ];
  if (user.sellerProfile?.status === "APPROVED") nav.push({ href: "/seller", label: "Seller dashboard", icon: "store" });
  return (
    <DashShell nav={nav} title="My account">
      {children}
    </DashShell>
  );
}

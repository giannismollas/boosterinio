import type { Metadata } from "next";
import { DashShell, type DashNavItem } from "@/components/dash-nav";
import { db } from "@/server/db";
import { requireSeller } from "@/server/session";

export const metadata: Metadata = {
  title: "Seller dashboard",
  robots: { index: false, follow: false },
};

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireSeller();

  const [toDeliver, myBoosts, board] = await Promise.all([
    profile.canSell ? db.order.count({ where: { type: "MARKET", sellerId: profile.id, status: { in: ["PAID", "IN_PROGRESS"] } } }) : 0,
    profile.canBoost ? db.order.count({ where: { type: "BOOST", boosterId: profile.id, status: "IN_PROGRESS" } }) : 0,
    profile.canBoost ? db.order.count({ where: { type: "BOOST", status: "PAID", boosterId: null } }) : 0,
  ]);

  const nav: DashNavItem[] = [
    { href: "/seller", label: "Overview", icon: "dashboard", exact: true, count: toDeliver + myBoosts || undefined },
    ...(profile.canSell
      ? ([
          { href: "/seller/listings", label: "Listings", icon: "listings" },
          { href: "/seller/orders", label: "Sales", icon: "orders", count: toDeliver || undefined },
        ] satisfies DashNavItem[])
      : []),
    ...(profile.canBoost ? ([{ href: "/seller/boosts", label: "Booster board", icon: "boosts", count: board || undefined }] satisfies DashNavItem[]) : []),
    { href: "/seller/wallet", label: "Wallet", icon: "wallet" },
    { href: "/seller/profile", label: "Store profile", icon: "profile" },
  ];

  return (
    <DashShell nav={nav} title={profile.displayName}>
      {children}
    </DashShell>
  );
}

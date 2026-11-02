import { Check, Clock, Pencil, Plus, ShoppingCart, ThumbsUp, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { ExpandableText, ShareButton, StoreTabs, type StoreTab } from "@/components/store/store-client";
import { Container } from "@/components/storefront";
import { Avatar } from "@/components/ui";
import { VerifiedBadge } from "@/components/verified-badge";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/catalog";
import { sellerUrl } from "@/lib/urls";
import { cn, formatDate, isOnline, ratingPercent, timeAgo } from "@/lib/utils";
import { toggleFollowAction } from "@/server/actions/follow";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/session";
import { getStore } from "./store";

/** The storefront frame: banner, identity, real stats, follow/share, and the section tabs. */
export default async function StoreLayout({ params, children }: { params: Promise<{ slug: string }>; children: ReactNode }) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();
  const user = await getCurrentUser();
  const own = user?.id === store.userId;
  const following = user && !own ? !!(await db.follow.findUnique({ where: { userId_sellerId: { userId: user.id, sellerId: store.id } }, select: { id: true } })) : false;

  const base = sellerUrl(store.slug);
  const pct = ratingPercent(store.ratingSum, store.ratingCount);
  const seen = store.user.lastSeenAt;
  const online = isOnline(seen);
  const roles = [store.canSell ? "Seller" : null, store.canBoost ? (store.peakRank ? `Booster · peak ${store.peakRank}` : "Booster") : null].filter(Boolean);
  const tabs: StoreTab[] = [
    { href: base, label: "Store", icon: "store" },
    { href: `${base}/reviews`, label: "Reviews", count: store.reviewCount, icon: "reviews" },
    ...CATEGORY_ORDER.map((c) => ({ href: `${base}/${CATEGORIES[c].slug}`, label: CATEGORIES[c].label, count: store.counts[c] ?? 0, icon: c })),
  ];

  return (
    <>
      <div className="relative h-36 overflow-hidden border-b border-white/[0.06] sm:h-52">
        {store.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.bannerUrl} alt="" className="size-full object-cover" />
        ) : (
          <DefaultBanner />
        )}
      </div>

      <Container>
        <header className="flex flex-col gap-5 pt-4 pb-6 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="relative -mt-14 w-fit shrink-0 sm:-mt-16">
              <Avatar
                name={store.displayName}
                src={store.avatarUrl}
                size={112}
                className="rounded-[24px] border-4 border-cab shadow-[0_14px_32px_-12px_rgb(0_0_0/0.95)]"
              />
              {online ? <span className="absolute right-1 bottom-1 size-5 rounded-full bg-ok ring-4 ring-cab" title="Online now" aria-label="Online now" /> : null}
            </div>
            <div className="min-w-0 sm:pt-2">
              <h1 className="flex items-center gap-2.5">
                <span className="t-display min-w-0 truncate text-[2.1rem] leading-[1.05] text-white sm:text-[2.6rem]">{store.displayName}</span>
                {store.verified ? <VerifiedBadge className="size-7" /> : null}
              </h1>
              <ul className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-2 md:gap-x-2.5 md:[&>li+li]:before:mr-2.5 md:[&>li+li]:before:text-ink-3 md:[&>li+li]:before:content-['·']">
                <li className="inline-flex items-center gap-1.5 tnum">
                  <ShoppingCart className="size-4 text-ink-3" aria-hidden /> {store.completedOrders} sold
                </li>
                <li className={cn("inline-flex items-center gap-1.5 tnum", pct && "text-ok")}>
                  <ThumbsUp className="size-4" aria-hidden /> {pct ? `${pct}% rating` : "No ratings yet"}
                </li>
                <li className="tnum">
                  {store.reviewCount} review{store.reviewCount === 1 ? "" : "s"}
                </li>
                <li className="inline-flex items-center gap-1.5 tnum">
                  <UsersRound className="size-4 text-ink-3" aria-hidden /> {store._count.followers} follower{store._count.followers === 1 ? "" : "s"}
                </li>
                <li className={cn("inline-flex items-center gap-1.5", online && "text-ok")}>
                  <Clock className="size-4" aria-hidden />
                  {online ? "Online now" : seen ? `Active ${timeAgo(seen)}` : `Since ${formatDate(store.reviewedAt ?? store.createdAt)}`}
                </li>
              </ul>
              <p className="mt-2 text-[0.8125rem] text-ink-3">
                {roles.join(" · ")}
                {roles.length ? " · " : ""}
                {store.verified ? "Verified by Boosterinio staff" : "Approved by Boosterinio staff"} · member since {formatDate(store.reviewedAt ?? store.createdAt)}
              </p>
              {store.bio ? <ExpandableText text={store.bio} className="mt-3 max-w-[72ch]" /> : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:pt-2">
            <ShareButton title={`${store.displayName} on Boosterinio`} path={base} />
            {own ? (
              <Link href="/seller/profile" className="btn btn-ghost">
                <Pencil className="size-4" aria-hidden /> Edit store
              </Link>
            ) : (
              <ActionForm action={toggleFollowAction}>
                <input type="hidden" name="slug" value={store.slug} />
                <SubmitButton className={following ? "btn-ghost" : "btn-p1"} pendingText={following ? "Unfollowing…" : "Following…"}>
                  {following ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
                  {following ? "Following" : "Follow"}
                </SubmitButton>
              </ActionForm>
            )}
          </div>
        </header>
        <StoreTabs tabs={tabs} />
      </Container>

      <Container className="pt-8">{children}</Container>
    </>
  );
}

/** Without an uploaded banner: the brand's dark ground, light streaks and the B. */
function DefaultBanner() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(70%_130%_at_82%_0%,rgb(255_46_136/0.26),transparent_62%),linear-gradient(160deg,#17162a_0%,#0b0b16_70%)]">
      <span className="streak top-[22%] left-[40%] w-[55%] -rotate-[24deg]" aria-hidden />
      <span className="streak top-[78%] left-[52%] w-[46%] -rotate-[24deg] opacity-60" aria-hidden />
      <Image src="/images/brand/b-plate-v2.webp" alt="" width={1100} height={1000} sizes="300px" className="absolute top-1/2 right-[5%] h-[165%] w-auto -translate-y-1/2" />
    </div>
  );
}

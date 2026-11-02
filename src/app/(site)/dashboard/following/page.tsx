import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Avatar, EmptyState, PageHeader } from "@/components/ui";
import { VerifiedBadge } from "@/components/verified-badge";
import { sellerUrl } from "@/lib/urls";
import { ratingPercent } from "@/lib/utils";
import { toggleFollowAction } from "@/server/actions/follow";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";

export const metadata = { title: "Following" };

export default async function FollowingPage() {
  const user = await requireUser("/dashboard/following");
  const follows = await db.follow.findMany({
    where: { userId: user.id, seller: { status: "APPROVED" } },
    orderBy: { createdAt: "desc" },
    include: {
      seller: {
        select: {
          slug: true,
          displayName: true,
          avatarUrl: true,
          verified: true,
          ratingSum: true,
          ratingCount: true,
          _count: { select: { listings: { where: { status: "ACTIVE" } } } },
        },
      },
    },
  });

  return (
    <>
      <PageHeader title="Following" description="Stores you follow. When one publishes a new listing, it shows up in your notifications." />
      {follows.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {follows.map((f) => {
            const pct = ratingPercent(f.seller.ratingSum, f.seller.ratingCount);
            return (
              <li key={f.id} className="panel-flat flex items-center gap-4 p-4">
                <Link href={sellerUrl(f.seller.slug)} className="flex min-w-0 flex-1 items-center gap-3.5">
                  <Avatar name={f.seller.displayName} src={f.seller.avatarUrl} size={44} className="rounded-[12px]" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-medium text-ink">
                      <span className="truncate">{f.seller.displayName}</span>
                      {f.seller.verified ? <VerifiedBadge /> : null}
                    </span>
                    <span className="block text-[0.8125rem] text-ink-3 tnum">
                      {f.seller._count.listings} live listing{f.seller._count.listings === 1 ? "" : "s"} · {pct ? `${pct}% rating` : "No ratings yet"}
                    </span>
                  </span>
                </Link>
                <ActionForm action={toggleFollowAction}>
                  <input type="hidden" name="slug" value={f.seller.slug} />
                  <SubmitButton className="btn-ghost btn-sm" pendingText="Unfollowing…">
                    Unfollow
                  </SubmitButton>
                </ActionForm>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title="Not following anyone yet"
          action={
            <Link href="/accounts" className="btn btn-p1">
              Browse the marketplace
            </Link>
          }
        >
          Follow a store from its page to hear about its new listings.
        </EmptyState>
      )}
    </>
  );
}

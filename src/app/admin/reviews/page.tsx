import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { EmptyState, LinkTabs, PageHeader, Pagination, Stars } from "@/components/ui";
import { formatDateTime, pageParam, str } from "@/lib/utils";
import { toggleReviewAction } from "@/server/actions/admin/reviews";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Reviews" };

const PER_PAGE = 20;

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const view = str(sp.view) === "hidden" ? "hidden" : str(sp.view) === "low" ? "low" : "visible";
  const page = pageParam(sp.page);
  const where = view === "hidden" ? { isHidden: true } : view === "low" ? { isHidden: false, rating: { lte: 2 } } : { isHidden: false };

  const [visible, hidden, low, total, reviews] = await Promise.all([
    db.review.count({ where: { isHidden: false } }),
    db.review.count({ where: { isHidden: true } }),
    db.review.count({ where: { isHidden: false, rating: { lte: 2 } } }),
    db.review.count({ where }),
    db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        author: { select: { id: true, name: true } },
        seller: { select: { id: true, displayName: true } },
        order: { select: { id: true, number: true, title: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader title="Reviews" description="Hide reviews that break the rules (abuse, personal data, spam). Hiding removes them from the seller's rating." />
      <LinkTabs
        current={view}
        items={[
          { key: "visible", label: "Visible", count: visible, href: "/admin/reviews" },
          { key: "low", label: "1–2 stars", count: low, href: "/admin/reviews?view=low" },
          { key: "hidden", label: "Hidden", count: hidden, href: "/admin/reviews?view=hidden" },
        ]}
      />
      {reviews.length ? (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="panel-flat flex flex-wrap items-start justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars value={r.rating} />
                  <span className="text-sm text-ink-2">
                    <Link href={`/admin/users/${r.author.id}`} className="hover:text-phosphor">
                      {r.author.name}
                    </Link>{" "}
                    reviewed{" "}
                    <Link href={`/admin/applications/${r.seller.id}`} className="hover:text-phosphor">
                      {r.seller.displayName}
                    </Link>
                  </span>
                  <span className="text-[0.75rem] text-ink-3">{formatDateTime(r.createdAt)}</span>
                </div>
                <p className="mt-2 max-w-[80ch] text-sm whitespace-pre-line text-ink">{r.comment ?? <span className="text-ink-3">No comment, rating only.</span>}</p>
                <Link href={`/admin/orders/${r.order.id}`} className="mt-2 inline-block text-[0.75rem] text-ink-3 hover:text-phosphor">
                  {r.order.number} · {r.order.title}
                </Link>
              </div>
              <ActionForm action={toggleReviewAction}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="hide" value={r.isHidden ? "false" : "true"} />
                <SubmitButton className={r.isHidden ? "btn-ghost btn-sm" : "btn-danger btn-sm"} pendingText="Saving…">
                  {r.isHidden ? "Restore" : "Hide"}
                </SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No reviews here">{view === "hidden" ? "Nothing has been hidden." : "Buyers can review completed orders. Their reviews appear here."}</EmptyState>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} href={(p) => `/admin/reviews?view=${view}${p > 1 ? `&page=${p}` : ""}`} />
    </>
  );
}

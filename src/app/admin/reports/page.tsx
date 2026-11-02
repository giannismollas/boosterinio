import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { EmptyState, LinkTabs, PageHeader, Pagination, StatusChip } from "@/components/ui";
import type { ReportStatus } from "@/generated/prisma/client";
import { formatDateTime, pageParam, str } from "@/lib/utils";
import { closeReportAction } from "@/server/actions/admin/reports";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Reports" };

const PER_PAGE = 20;
const TABS: { key: ReportStatus; label: string }[] = [
  { key: "OPEN", label: "Open" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "DISMISSED", label: "Dismissed" },
];

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const status = TABS.some((t) => t.key === str(sp.status)) ? (str(sp.status) as ReportStatus) : "OPEN";
  const page = pageParam(sp.page);

  const [counts, total, reports] = await Promise.all([
    db.report.groupBy({ by: ["status"], _count: { _all: true } }),
    db.report.count({ where: { status } }),
    db.report.findMany({
      where: { status },
      orderBy: { createdAt: status === "OPEN" ? "asc" : "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        reporter: { select: { id: true, email: true } },
        listing: { select: { id: true, title: true, status: true } },
        seller: { select: { id: true, displayName: true } },
      },
    }),
  ]);
  const countOf = (s: ReportStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <>
      <PageHeader title="Reports" description="Listings and sellers flagged by users. Check the target, act on it if needed, then close the report." />
      <LinkTabs current={status} items={TABS.map((t) => ({ key: t.key, label: t.label, count: countOf(t.key), href: `/admin/reports?status=${t.key}` }))} />

      {reports.length ? (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="panel-flat p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{r.reason}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-ink-3">
                    Reported by{" "}
                    <Link href={`/admin/users/${r.reporter.id}`} className="text-ink-2 hover:text-phosphor">
                      {r.reporter.email}
                    </Link>{" "}
                    · {formatDateTime(r.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  {r.listing ? (
                    <Link href={`/admin/listings/${r.listing.id}`} className="chip chip-plain max-w-[320px] truncate text-ink-2 hover:text-ink">
                      Listing: {r.listing.title}
                    </Link>
                  ) : null}
                  {r.seller ? (
                    <Link href={`/admin/applications/${r.seller.id}`} className="chip chip-plain text-ink-2 hover:text-ink">
                      Seller: {r.seller.displayName}
                    </Link>
                  ) : null}
                  {!r.listing && !r.seller ? <StatusChip tone="muted">Target deleted</StatusChip> : null}
                </div>
              </div>
              {r.details ? <p className="mt-3 max-w-[80ch] text-sm whitespace-pre-line text-ink-2">{r.details}</p> : null}

              {status === "OPEN" ? (
                <ActionForm action={closeReportAction} className="mt-4 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <label className="min-w-[240px] flex-1">
                    <span className="sr-only">Staff note</span>
                    <input name="staffNote" maxLength={500} className="field" placeholder="What did you do? (optional)" />
                  </label>
                  <SubmitButton className="btn-p2" name="status" value="RESOLVED" pendingText="Saving…">
                    Resolve
                  </SubmitButton>
                  <SubmitButton className="btn-ghost" name="status" value="DISMISSED" pendingText="Saving…">
                    Dismiss
                  </SubmitButton>
                </ActionForm>
              ) : (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[0.8125rem] text-ink-3">
                  <span>
                    Closed {r.resolvedAt ? formatDateTime(r.resolvedAt) : ""}
                    {r.staffNote ? ` · ${r.staffNote}` : ""}
                  </span>
                  <ActionForm action={closeReportAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <SubmitButton className="btn-ghost btn-sm" name="status" value="OPEN">
                      Reopen
                    </SubmitButton>
                  </ActionForm>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={status === "OPEN" ? "No open reports" : "Nothing here"}>
          {status === "OPEN" ? "When a user reports a listing or seller it appears here." : "No reports with this status yet."}
        </EmptyState>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} href={(p) => `/admin/reports?status=${status}${p > 1 ? `&page=${p}` : ""}`} />
    </>
  );
}

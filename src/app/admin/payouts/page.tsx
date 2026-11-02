import type { Metadata } from "next";
import Link from "next/link";
import { Numeral } from "@/components/admin/shared";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Avatar, EmptyState, LinkTabs, PageHeader, Pagination, StatusChip } from "@/components/ui";
import type { PayoutStatus } from "@/generated/prisma/client";
import { PAYOUT_METHODS, PAYOUT_STATUS } from "@/lib/catalog";
import { formatDateTime, formatMoney, pageParam, str } from "@/lib/utils";
import { payoutPaidAction, payoutRejectAction } from "@/server/actions/admin/payouts";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Payouts" };

const PER_PAGE = 20;
const TABS: PayoutStatus[] = ["REQUESTED", "PAID", "REJECTED"];
const METHOD_LABEL = Object.fromEntries(PAYOUT_METHODS.map((m) => [m.id, m.label])) as Record<string, string>;

export default async function AdminPayoutsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const status = (TABS as string[]).includes(str(sp.status)) ? (str(sp.status) as PayoutStatus) : "REQUESTED";
  const page = pageParam(sp.page);

  const [counts, total, sum, payouts] = await Promise.all([
    db.payout.groupBy({ by: ["status"], _count: { _all: true } }),
    db.payout.count({ where: { status } }),
    db.payout.aggregate({ where: { status }, _sum: { amount: true } }),
    db.payout.findMany({
      where: { status },
      orderBy: { createdAt: status === "REQUESTED" ? "asc" : "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        seller: {
          select: { id: true, displayName: true, avatarUrl: true, balance: true, pendingBalance: true, completedOrders: true, status: true, user: { select: { email: true } } },
        },
      },
    }),
  ]);
  const countOf = (s: PayoutStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <>
      <PageHeader
        title="Payouts"
        description="Send the money with the seller's chosen method, then mark the request paid with your transfer reference."
        actions={
          <div className="text-right">
            <p className="text-[0.75rem] text-ink-3">{status === "REQUESTED" ? "Waiting to be sent" : "Total in this tab"}</p>
            <Numeral className="text-3xl text-ink">{formatMoney(sum._sum.amount ?? 0)}</Numeral>
          </div>
        }
      />
      <LinkTabs current={status} items={TABS.map((s) => ({ key: s, label: PAYOUT_STATUS[s].label, count: countOf(s), href: `/admin/payouts?status=${s}` }))} />

      {payouts.length ? (
        <ul className="space-y-3">
          {payouts.map((p) => (
            <li key={p.id} className="panel-flat p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar name={p.seller.displayName} src={p.seller.avatarUrl} size={40} />
                  <div className="min-w-0">
                    <Link href={`/admin/applications/${p.seller.id}`} className="block truncate font-medium text-ink hover:text-phosphor">
                      {p.seller.displayName}
                    </Link>
                    <p className="truncate text-[0.8125rem] text-ink-3">{p.seller.user.email}</p>
                    <p className="mt-1 text-[0.75rem] text-ink-3">
                      Balance {formatMoney(p.seller.balance)} · escrow {formatMoney(p.seller.pendingBalance)} · {p.seller.completedOrders} completed
                    </p>
                    {p.seller.status !== "APPROVED" ? <StatusChip tone="warn" className="mt-2">Seller {p.seller.status.toLowerCase()}</StatusChip> : null}
                  </div>
                </div>

                <div className="min-w-0">
                  <Numeral className="text-[2.4rem] text-ink">{formatMoney(p.amount)}</Numeral>
                  <p className="mt-1 text-sm text-ink-2">{METHOD_LABEL[p.method] ?? p.method}</p>
                  <p className="mt-1 text-sm break-all whitespace-pre-line text-ink">{p.details}</p>
                  <p className="mt-1 text-[0.75rem] text-ink-3">Requested {formatDateTime(p.createdAt)}</p>
                </div>

                <div className="min-w-0">
                  {p.status === "REQUESTED" ? (
                    <div className="space-y-3">
                      <ActionForm action={payoutPaidAction} className="flex flex-wrap gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <input name="reference" maxLength={200} className="field min-w-0 flex-1" placeholder="Transfer reference" aria-label="Transfer reference" />
                        <SubmitButton className="btn-p2" pendingText="Saving…">
                          Mark paid
                        </SubmitButton>
                      </ActionForm>
                      <ActionForm action={payoutRejectAction} className="flex flex-wrap gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <input name="note" required minLength={3} maxLength={500} className="field min-w-0 flex-1" placeholder="Reason to decline" aria-label="Reason to decline" />
                        <ConfirmButton className="btn-danger" message={`Decline the ${formatMoney(p.amount)} payout? The money returns to the seller's balance.`}>
                          Decline
                        </ConfirmButton>
                      </ActionForm>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-sm">
                      <StatusChip tone={PAYOUT_STATUS[p.status].tone}>{PAYOUT_STATUS[p.status].label}</StatusChip>
                      <p className="text-ink-3">{p.processedAt ? formatDateTime(p.processedAt) : ""}</p>
                      {p.reference ? <p className="break-all text-ink-2">Ref: {p.reference}</p> : null}
                      {p.staffNote ? <p className="text-ink-2">{p.staffNote}</p> : null}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={status === "REQUESTED" ? "No payouts waiting" : "Nothing here"}>
          {status === "REQUESTED" ? "Sellers request payouts from their wallet. Requests appear here." : "No payouts with this status yet."}
        </EmptyState>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} href={(n) => `/admin/payouts?status=${status}${n > 1 ? `&page=${n}` : ""}`} />
    </>
  );
}

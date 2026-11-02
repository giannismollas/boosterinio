import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { WALLET_TX_LABELS } from "@/components/seller/constants";
import { EmptyState, PageHeader, Pagination, StatTile, StatusChip } from "@/components/ui";
import { PAYOUT_METHODS, PAYOUT_STATUS } from "@/lib/catalog";
import { orderUrl } from "@/lib/urls";
import { cn, formatDate, formatDateTime, formatMoney, pageParam } from "@/lib/utils";
import { requestPayoutAction } from "@/server/actions/seller";
import { db } from "@/server/db";
import { requireSeller } from "@/server/session";
import { getSettings } from "@/server/settings";

const PER_PAGE = 25;

export default async function SellerWalletPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { profile } = await requireSeller();
  const sp = await searchParams;
  const page = pageParam(sp.page);

  const [settings, payouts, txs, txTotal] = await Promise.all([
    getSettings(),
    db.payout.findMany({ where: { sellerId: profile.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.walletTransaction.findMany({
      where: { sellerId: profile.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { order: { select: { number: true } } },
    }),
    db.walletTransaction.count({ where: { sellerId: profile.id } }),
  ]);
  const open = payouts.find((p) => p.status === "REQUESTED");
  const canWithdraw = !open && profile.balance >= settings.minPayoutCents;
  const defaultMethod = PAYOUT_METHODS.some((m) => m.id === profile.payoutMethod) ? profile.payoutMethod! : PAYOUT_METHODS[0].id;

  return (
    <>
      <PageHeader
        title="Wallet"
        description="Earnings stay in escrow while an order is open and move to your available balance when it completes."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Available" value={formatMoney(profile.balance)} sub="Ready to withdraw" />
        <StatTile label="In escrow" value={formatMoney(profile.pendingBalance)} sub="From open orders" />
        <StatTile label="Total earned" value={formatMoney(profile.totalEarned)} sub={`${profile.completedOrders} completed orders`} />
      </div>

      <section className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" aria-labelledby="payout-h">
        <div className="panel p-5 sm:p-6">
          <h2 id="payout-h" className="t-display text-3xl text-ink uppercase">
            Request a payout
          </h2>
          {open ? (
            <div className="mt-4 rounded-[12px] border border-warn/40 bg-warn/5 p-4 text-sm text-ink-2" role="status">
              Your payout of <span className="text-ink tnum">{formatMoney(open.amount)}</span> ({PAYOUT_METHODS.find((m) => m.id === open.method)?.label ?? open.method})
              was requested on {formatDate(open.createdAt)}. You can request another once staff have processed it.
            </div>
          ) : (
            <ActionForm action={requestPayoutAction} className="mt-4 space-y-4" resetOnSuccess>
              <p className="text-sm text-ink-2">
                Minimum {formatMoney(settings.minPayoutCents)}. Payouts are sent by staff, usually within two business days.
              </p>
              <div>
                <label htmlFor="amount" className="label">
                  Amount
                </label>
                <input
                  id="amount"
                  name="amount"
                  className="field tnum"
                  inputMode="decimal"
                  defaultValue={canWithdraw ? (profile.balance / 100).toFixed(2) : ""}
                  placeholder={(settings.minPayoutCents / 100).toFixed(2)}
                  required
                />
                <p className="mt-1.5 text-[0.8125rem] text-ink-3">Available: {formatMoney(profile.balance)}</p>
              </div>
              <div>
                <label htmlFor="method" className="label">
                  Method
                </label>
                <select id="method" name="method" className="field" defaultValue={defaultMethod}>
                  {PAYOUT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="details" className="label">
                  Payout details
                </label>
                <textarea
                  id="details"
                  name="details"
                  className="field min-h-24"
                  defaultValue={profile.payoutDetails ?? ""}
                  maxLength={500}
                  placeholder="PayPal email, IBAN with account holder name, or your USDT (TRC20) address"
                  required
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-2">
                <input type="checkbox" name="saveDefault" defaultChecked className="size-4 accent-[#2f6bff]" />
                Save as my default payout details
              </label>
              <SubmitButton className="btn-coin" pendingText="Requesting…" disabled={!canWithdraw}>
                Request payout
              </SubmitButton>
              {!canWithdraw ? (
                <p className="text-[0.8125rem] text-ink-3">
                  You need at least {formatMoney(settings.minPayoutCents)} available to request a payout.
                </p>
              ) : null}
            </ActionForm>
          )}
        </div>

        <div>
          <h2 className="t-display text-3xl text-ink uppercase">Payouts</h2>
          {payouts.length ? (
            <div className="panel-flat mt-4 overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Requested</th>
                    <th className="text-right">Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => {
                    const st = PAYOUT_STATUS[p.status];
                    return (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap text-ink-2">{formatDate(p.createdAt)}</td>
                        <td className="text-right text-ink tnum">{formatMoney(p.amount)}</td>
                        <td className="text-ink-2">{PAYOUT_METHODS.find((m) => m.id === p.method)?.label ?? p.method}</td>
                        <td>
                          <StatusChip tone={st.tone}>{st.label}</StatusChip>
                          {p.reference ? <span className="mt-1 block text-[0.75rem] text-ink-3">Ref: {p.reference}</span> : null}
                          {p.staffNote ? <span className="mt-1 block text-[0.75rem] text-ink-3">{p.staffNote}</span> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No payouts yet" className="mt-4">
              Requested payouts and their status show up here.
            </EmptyState>
          )}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="tx-h">
        <h2 id="tx-h" className="t-display text-3xl text-ink uppercase">
          History
        </h2>
        {txs.length ? (
          <div className="panel-flat mt-4 overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Balance</th>
                  <th className="text-right">Amount</th>
                  <th>Order</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => {
                  const meta = WALLET_TX_LABELS[t.type] ?? { label: t.type, bucket: "Available" };
                  return (
                    <tr key={t.id}>
                      <td className="whitespace-nowrap text-ink-3">{formatDateTime(t.createdAt)}</td>
                      <td className="text-ink-2">{meta.label}</td>
                      <td className="text-[0.8125rem] text-ink-3">{meta.bucket}</td>
                      <td className={cn("text-right tnum", t.amount >= 0 ? "text-ok" : "text-ink-2")}>
                        {t.amount >= 0 ? "+" : "−"}
                        {formatMoney(Math.abs(t.amount))}
                      </td>
                      <td>
                        {t.order ? (
                          <Link href={orderUrl(t.order.number)} className="font-pixel text-[0.6875rem] text-phosphor uppercase hover:underline">
                            {t.order.number}
                          </Link>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                      <td className="max-w-[18rem] truncate text-[0.8125rem] text-ink-3">{t.note ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No activity yet" className="mt-4">
            Escrow holds, releases and payouts are recorded here.
          </EmptyState>
        )}
        <Pagination page={page} pageCount={Math.max(1, Math.ceil(txTotal / PER_PAGE))} href={(p) => (p > 1 ? `/seller/wallet?page=${p}` : "/seller/wallet")} />
      </section>
    </>
  );
}

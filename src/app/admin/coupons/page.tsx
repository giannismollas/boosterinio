import type { Metadata } from "next";
import { TableWrap } from "@/components/admin/shared";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { EmptyState, PageHeader, StatusChip } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/utils";
import { createCouponAction, deleteCouponAction, toggleCouponAction } from "@/server/actions/admin/coupons";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Coupons" };

const SCOPE_LABEL = { ALL: "All orders", BOOST: "Boosting only", MARKET: "Marketplace only" } as const;

export default async function AdminCouponsPage() {
  await requireAdmin();
  const coupons = await db.coupon.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "desc" }], include: { _count: { select: { orders: true } } } });
  const now = new Date();

  return (
    <>
      <PageHeader title="Coupons" description="Discounts are funded by the platform: sellers and boosters are always paid on the undiscounted price." />

      <section className="panel-flat mb-8 p-5">
        <h2 className="mb-4 text-[0.9375rem] font-semibold text-ink">Create a coupon</h2>
        <ActionForm action={createCouponAction} resetOnSuccess className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="c-code" className="label">
              Code
            </label>
            <input id="c-code" name="code" required maxLength={24} placeholder="e.g. LAUNCH10" className="field uppercase" />
          </div>
          <div>
            <label htmlFor="c-type" className="label">
              Discount type
            </label>
            <select id="c-type" name="type" className="field" defaultValue="PERCENT">
              <option value="PERCENT">Percent off</option>
              <option value="FIXED">Fixed amount off</option>
            </select>
          </div>
          <div>
            <label htmlFor="c-value" className="label">
              Value
            </label>
            <input id="c-value" name="value" required inputMode="decimal" placeholder="10 (%) or 5.00" className="field" />
          </div>
          <div>
            <label htmlFor="c-scope" className="label">
              Applies to
            </label>
            <select id="c-scope" name="scope" className="field" defaultValue="ALL">
              {Object.entries(SCOPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="c-min" className="label">
              Minimum order
            </label>
            <input id="c-min" name="minOrder" inputMode="decimal" placeholder="0.00" className="field" />
          </div>
          <div>
            <label htmlFor="c-max" className="label">
              Max uses
            </label>
            <input id="c-max" name="maxUses" type="number" min={1} placeholder="Unlimited" className="field" />
          </div>
          <div>
            <label htmlFor="c-exp" className="label">
              Expires on
            </label>
            <input id="c-exp" name="expiresAt" type="date" className="field" />
          </div>
          <div className="flex flex-col justify-end gap-3">
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input type="checkbox" name="isActive" defaultChecked className="size-4 accent-[#ff2e88]" />
              Active right away
            </label>
            <SubmitButton className="btn-coin w-full" pendingText="Creating…">
              Create coupon
            </SubmitButton>
          </div>
        </ActionForm>
      </section>

      {coupons.length ? (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Applies to</th>
                <th className="text-right">Min. order</th>
                <th className="text-right">Used</th>
                <th>Expires</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const expired = !!c.expiresAt && c.expiresAt < now;
                const usedUp = c.maxUses !== null && c.usedCount >= c.maxUses;
                return (
                  <tr key={c.id}>
                    <td className="font-display text-xl tracking-wider text-ink">{c.code}</td>
                    <td className="tnum">{c.type === "PERCENT" ? `${c.value}%` : formatMoney(c.value)}</td>
                    <td className="text-ink-2">{SCOPE_LABEL[c.scope]}</td>
                    <td className="text-right tnum">{c.minOrder ? formatMoney(c.minOrder) : "—"}</td>
                    <td className="text-right tnum">
                      {c.usedCount}
                      {c.maxUses !== null ? ` / ${c.maxUses}` : ""}
                    </td>
                    <td className="whitespace-nowrap text-ink-3">{c.expiresAt ? formatDate(c.expiresAt) : "Never"}</td>
                    <td>
                      {!c.isActive ? (
                        <StatusChip tone="muted">Disabled</StatusChip>
                      ) : expired ? (
                        <StatusChip tone="warn">Expired</StatusChip>
                      ) : usedUp ? (
                        <StatusChip tone="warn">Used up</StatusChip>
                      ) : (
                        <StatusChip tone="ok">Active</StatusChip>
                      )}
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <ActionForm action={toggleCouponAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <SubmitButton className="btn-ghost btn-sm">{c.isActive ? "Disable" : "Enable"}</SubmitButton>
                        </ActionForm>
                        {c.usedCount === 0 && c._count.orders === 0 ? (
                          <ActionForm action={deleteCouponAction}>
                            <input type="hidden" name="id" value={c.id} />
                            <ConfirmButton className="btn-danger btn-sm" message={`Delete coupon ${c.code}?`}>
                              Delete
                            </ConfirmButton>
                          </ActionForm>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <EmptyState title="No coupons yet">Create a code above to run a promotion. Buyers enter it at checkout.</EmptyState>
      )}
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KV, Numeral, Section, TableWrap } from "@/components/admin/shared";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Avatar, PageHeader, StatusChip } from "@/components/ui";
import { ORDER_STATUS, SELLER_STATUS, TICKET_STATUS } from "@/lib/catalog";
import { formatDate, formatDateTime, formatMoney, timeAgo } from "@/lib/utils";
import { adjustWalletAction, banUserAction, setRoleAction, setSellerVerifiedAction } from "@/server/actions/admin/users";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const u = await db.user.findUnique({ where: { id }, select: { name: true } });
  return { title: u ? u.name : "User" };
}

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    include: {
      sellerProfile: true,
      accounts: { select: { providerId: true } },
      orders: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, number: true, title: true, status: true, total: true, currency: true, createdAt: true } },
      tickets: { orderBy: { lastReplyAt: "desc" }, take: 20, select: { id: true, number: true, subject: true, status: true, lastReplyAt: true } },
      _count: { select: { orders: true, tickets: true, sessions: true } },
    },
  });
  if (!user) notFound();
  const isAdmin = staff.role === "ADMIN";
  const self = staff.id === user.id;
  const spent = await db.order.aggregate({ where: { buyerId: id, paidAt: { not: null }, status: { notIn: ["REFUNDED", "CANCELLED"] } }, _sum: { total: true } });
  const providers = [...new Set(user.accounts.map((a) => (a.providerId === "credential" ? "Email & password" : a.providerId)))];

  return (
    <>
      <PageHeader
        title={user.name}
        description={user.email}
        actions={
          <>
            <StatusChip tone={user.role === "ADMIN" ? "p1" : user.role === "SUPPORT" ? "p2" : "muted"}>{user.role.toLowerCase()}</StatusChip>
            {user.banned ? <StatusChip tone="bad">Banned</StatusChip> : null}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Section title="Profile">
            <div className="mb-5 flex items-center gap-3">
              <Avatar name={user.name} src={user.image} size={48} />
              <div>
                <p className="font-medium text-ink">{user.name}</p>
                <p className="text-[0.8125rem] text-ink-3">{user.email}</p>
              </div>
            </div>
            <KV
              items={[
                ["Email verified", user.emailVerified ? "Yes" : "No"],
                ["Sign-in methods", providers.join(", ") || "None"],
                ["Active sessions", user._count.sessions],
                ["Joined", formatDateTime(user.createdAt)],
                ["Spent", formatMoney(spent._sum.total ?? 0)],
                ["Ban reason", user.banned ? user.banReason : null],
                [
                  "Seller profile",
                  user.sellerProfile ? (
                    <Link key="sp" href={`/admin/applications/${user.sellerProfile.id}`} className="inline-flex items-center gap-2 text-phosphor hover:underline">
                      {user.sellerProfile.displayName}
                      <StatusChip tone={SELLER_STATUS[user.sellerProfile.status].tone}>{SELLER_STATUS[user.sellerProfile.status].label}</StatusChip>
                    </Link>
                  ) : null,
                ],
              ]}
            />
          </Section>

          <Section title={`Orders as buyer (${user._count.orders})`} actions={user._count.orders > 20 ? <Link href={`/admin/orders?q=${encodeURIComponent(user.email)}`} className="text-sm text-phosphor hover:underline">See all</Link> : null}>
            {user.orders.length ? (
              <TableWrap>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Item</th>
                      <th>Status</th>
                      <th className="text-right">Total</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/admin/orders/${o.id}`} className="font-medium whitespace-nowrap text-ink hover:text-phosphor">
                            {o.number}
                          </Link>
                        </td>
                        <td className="max-w-[260px] truncate text-ink-2">{o.title}</td>
                        <td>
                          <StatusChip tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</StatusChip>
                        </td>
                        <td className="text-right tnum">{formatMoney(o.total, o.currency)}</td>
                        <td className="whitespace-nowrap text-ink-3">{timeAgo(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <p className="text-sm text-ink-3">No orders yet.</p>
            )}
          </Section>

          <Section title={`Tickets (${user._count.tickets})`}>
            {user.tickets.length ? (
              <ul className="divide-y divide-cab-4">
                {user.tickets.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/admin/tickets/${t.id}`} className="min-w-0 truncate text-sm text-ink hover:text-phosphor">
                      #{t.number} {t.subject}
                    </Link>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-[0.75rem] text-ink-3">{timeAgo(t.lastReplyAt)}</span>
                      <StatusChip tone={TICKET_STATUS[t.status].tone}>{TICKET_STATUS[t.status].label}</StatusChip>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">No tickets.</p>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          {user.sellerProfile ? (
            <Section title="Seller wallet">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[0.75rem] text-ink-3">Available</p>
                  <Numeral className="text-3xl text-ink">{formatMoney(user.sellerProfile.balance)}</Numeral>
                </div>
                <div>
                  <p className="text-[0.75rem] text-ink-3">In escrow</p>
                  <Numeral className="text-3xl text-ink-2">{formatMoney(user.sellerProfile.pendingBalance)}</Numeral>
                </div>
              </div>
              {isAdmin ? (
                <ActionForm action={adjustWalletAction} resetOnSuccess className="mt-5 space-y-3 border-t border-cab-4 pt-4">
                  <input type="hidden" name="sellerId" value={user.sellerProfile.id} />
                  <input type="hidden" name="userId" value={user.id} />
                  <div>
                    <label htmlFor="adj-amount" className="label">
                      Adjust available balance
                    </label>
                    <input id="adj-amount" name="amount" inputMode="decimal" required className="field" placeholder="e.g. 12.50 or -5.00" />
                  </div>
                  <div>
                    <label htmlFor="adj-note" className="label">
                      Reason (visible to the seller)
                    </label>
                    <input id="adj-note" name="note" required minLength={3} maxLength={300} className="field" placeholder="e.g. Goodwill credit for ticket #12" />
                  </div>
                  <ConfirmButton className="btn-ghost w-full" message="Apply this balance adjustment?">
                    Apply adjustment
                  </ConfirmButton>
                </ActionForm>
              ) : null}
            </Section>
          ) : null}

          {isAdmin && user.sellerProfile?.status === "APPROVED" ? (
            <Section
              title={user.sellerProfile.verified ? "Verified seller" : "Verify seller"}
              description={
                user.sellerProfile.verified
                  ? `Verified ${formatDate(user.sellerProfile.verifiedAt)}. Buyers see the badge on the storefront and every listing.`
                  : "Grant the verified badge after you've checked their identity and sales history. It shows on the storefront and every listing."
              }
            >
              <ActionForm action={setSellerVerifiedAction}>
                <input type="hidden" name="id" value={user.id} />
                <input type="hidden" name="op" value={user.sellerProfile.verified ? "unverify" : "verify"} />
                {user.sellerProfile.verified ? (
                  <ConfirmButton className="btn-ghost w-full" message={`Remove the verified badge from ${user.sellerProfile.displayName}?`}>
                    Remove badge
                  </ConfirmButton>
                ) : (
                  <SubmitButton className="btn-p1 w-full" pendingText="Verifying…">
                    Verify {user.sellerProfile.displayName}
                  </SubmitButton>
                )}
              </ActionForm>
            </Section>
          ) : null}

          {isAdmin && !self ? (
            <Section title="Role" description="Support can work every queue. Admins can also change prices, settings and roles.">
              <ActionForm action={setRoleAction} className="flex gap-2">
                <input type="hidden" name="id" value={user.id} />
                <select name="role" defaultValue={user.role} className="field" aria-label="Role">
                  <option value="USER">User</option>
                  <option value="SUPPORT">Support</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <SubmitButton className="btn-ghost shrink-0" pendingText="Saving…">
                  Save
                </SubmitButton>
              </ActionForm>
            </Section>
          ) : null}

          {isAdmin && !self ? (
            <Section title={user.banned ? "Lift ban" : "Ban account"} description={user.banned ? undefined : "Signs them out everywhere and pauses their listings."}>
              <ActionForm action={banUserAction} className="space-y-3">
                <input type="hidden" name="id" value={user.id} />
                <input type="hidden" name="op" value={user.banned ? "unban" : "ban"} />
                {user.banned ? (
                  <SubmitButton className="btn-ghost w-full" pendingText="Saving…">
                    Lift ban
                  </SubmitButton>
                ) : (
                  <>
                    <label htmlFor="ban-reason" className="label">
                      Reason
                    </label>
                    <input id="ban-reason" name="reason" required minLength={3} maxLength={500} className="field" placeholder="e.g. Chargeback fraud" />
                    <ConfirmButton className="btn-danger w-full" message={`Ban ${user.email}? They will be signed out immediately.`}>
                      Ban account
                    </ConfirmButton>
                  </>
                )}
              </ActionForm>
            </Section>
          ) : null}

          {!isAdmin ? <p className="text-[0.8125rem] text-ink-3">Role changes, bans and wallet adjustments need an admin.</p> : null}
        </div>
      </div>
    </>
  );
}

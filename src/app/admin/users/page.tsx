import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar, FilterField, TableWrap } from "@/components/admin/shared";
import { Avatar, EmptyState, PageHeader, Pagination, StatusChip } from "@/components/ui";
import type { Prisma, Role } from "@/generated/prisma/client";
import { SELLER_STATUS } from "@/lib/catalog";
import { formatDate, pageParam, str } from "@/lib/utils";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Users" };

const PER_PAGE = 30;
const ROLES: Role[] = ["USER", "SUPPORT", "ADMIN"];
const ROLE_TONE = { USER: "muted", SUPPORT: "p2", ADMIN: "p1" } as const;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const q = str(sp.q).trim();
  const role = (ROLES as string[]).includes(str(sp.role)) ? (str(sp.role) as Role) : undefined;
  const flag = str(sp.flag);
  const page = pageParam(sp.page);

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(flag === "banned" ? { banned: true } : flag === "sellers" ? { sellerProfile: { isNot: null } } : {}),
    ...(q
      ? {
          OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        sellerProfile: { select: { id: true, status: true, displayName: true } },
        _count: { select: { orders: true, tickets: true } },
      },
    }),
  ]);

  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    if (flag) params.set("flag", flag);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/users${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Users" description={`${total} ${total === 1 ? "account" : "accounts"}.`} />
      <FilterBar resetHref="/admin/users">
        <FilterField label="Search" className="min-w-[260px] flex-1">
          <input name="q" defaultValue={q} placeholder="Email or name" className="field" />
        </FilterField>
        <FilterField label="Role">
          <select name="role" defaultValue={role ?? ""} className="field min-w-36">
            <option value="">Any role</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Show">
          <select name="flag" defaultValue={flag} className="field min-w-40">
            <option value="">Everyone</option>
            <option value="sellers">Sellers and boosters</option>
            <option value="banned">Banned</option>
          </select>
        </FilterField>
      </FilterBar>

      {users.length ? (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Seller</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Tickets</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link href={`/admin/users/${u.id}`} className="flex items-center gap-2.5">
                      <Avatar name={u.name} src={u.image} size={30} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink hover:text-phosphor">{u.name}</span>
                        <span className="block truncate text-[0.75rem] text-ink-3">{u.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <span className="flex flex-wrap gap-1.5">
                      <StatusChip tone={ROLE_TONE[u.role]}>{u.role.toLowerCase()}</StatusChip>
                      {u.banned ? <StatusChip tone="bad">Banned</StatusChip> : null}
                    </span>
                  </td>
                  <td>
                    {u.sellerProfile ? (
                      <Link href={`/admin/applications/${u.sellerProfile.id}`} className="hover:opacity-80">
                        <StatusChip tone={SELLER_STATUS[u.sellerProfile.status].tone}>{SELLER_STATUS[u.sellerProfile.status].label}</StatusChip>
                      </Link>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </td>
                  <td className="text-right tnum">{u._count.orders}</td>
                  <td className="text-right tnum">{u._count.tickets}</td>
                  <td className="whitespace-nowrap text-ink-3">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <EmptyState title="No users found">Try a different email, name or filter.</EmptyState>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} href={qs} />
    </>
  );
}

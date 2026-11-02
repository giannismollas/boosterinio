import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar, FilterField, TableWrap } from "@/components/admin/shared";
import { Avatar, EmptyState, LinkTabs, PageHeader, Pagination, StatusChip } from "@/components/ui";
import type { Prisma, SellerStatus } from "@/generated/prisma/client";
import { SELLER_STATUS } from "@/lib/catalog";
import { formatMoney, pageParam, str, timeAgo } from "@/lib/utils";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Applications" };

const PER_PAGE = 25;
const TABS: SellerStatus[] = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];
const TYPE_LABEL = { SELLER: "Seller", BOOSTER: "Booster", BOTH: "Seller + booster" } as const;

export default async function AdminApplicationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const status = (TABS as string[]).includes(str(sp.status)) ? (str(sp.status) as SellerStatus) : "PENDING";
  const q = str(sp.q).trim();
  const page = pageParam(sp.page);

  const where: Prisma.SellerProfileWhereInput = {
    status,
    ...(q
      ? {
          OR: [
            { displayName: { contains: q, mode: "insensitive" } },
            { user: { email: { contains: q, mode: "insensitive" } } },
            { discord: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [counts, total, profiles, games] = await Promise.all([
    db.sellerProfile.groupBy({ by: ["status"], _count: { _all: true } }),
    db.sellerProfile.count({ where }),
    db.sellerProfile.findMany({
      where,
      orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { user: { select: { email: true } }, _count: { select: { listings: true } } },
    }),
    db.game.findMany({ select: { slug: true, name: true } }),
  ]);
  const gameName = new Map(games.map((g) => [g.slug, g.name]));
  const countOf = (s: SellerStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <>
      <PageHeader title="Applications" description="Sellers and boosters can't trade until staff approve them. Oldest pending applications come first." />
      <LinkTabs current={status} items={TABS.map((s) => ({ key: s, label: SELLER_STATUS[s].label, count: countOf(s), href: `/admin/applications?status=${s}` }))} />
      <FilterBar resetHref={`/admin/applications?status=${status}`}>
        <input type="hidden" name="status" value={status} />
        <FilterField label="Search" className="min-w-[260px] flex-1">
          <input name="q" defaultValue={q} placeholder="Name, email or Discord" className="field" />
        </FilterField>
      </FilterBar>

      {profiles.length ? (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Applying as</th>
                <th>Games</th>
                <th>Peak rank</th>
                <th>Country</th>
                {status === "APPROVED" ? <th className="text-right">Balance</th> : null}
                <th>{status === "PENDING" ? "Applied" : "Reviewed"}</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/applications/${p.id}`} className="flex items-center gap-2.5">
                      <Avatar name={p.displayName} src={p.avatarUrl} size={30} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink hover:text-phosphor">{p.displayName}</span>
                        <span className="block truncate text-[0.75rem] text-ink-3">{p.user.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="text-ink-2">{TYPE_LABEL[p.applicationType]}</td>
                  <td className="max-w-[220px] truncate text-ink-2">{p.games.map((g) => gameName.get(g) ?? g).join(", ") || "—"}</td>
                  <td className="text-ink-2">{p.peakRank ?? "—"}</td>
                  <td className="text-ink-2">{p.country ?? "—"}</td>
                  {status === "APPROVED" ? <td className="text-right tnum">{formatMoney(p.balance)}</td> : null}
                  <td className="whitespace-nowrap text-ink-3">{timeAgo(status === "PENDING" ? p.createdAt : (p.reviewedAt ?? p.updatedAt))}</td>
                  <td>
                    <StatusChip tone={SELLER_STATUS[p.status].tone}>{SELLER_STATUS[p.status].label}</StatusChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <EmptyState title={status === "PENDING" ? "No applications waiting" : "Nobody here"}>
          {status === "PENDING" ? "New seller and booster applications show up here for review." : "No sellers with this status."}
        </EmptyState>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} href={(p) => `/admin/applications?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ""}${p > 1 ? `&page=${p}` : ""}`} />
    </>
  );
}

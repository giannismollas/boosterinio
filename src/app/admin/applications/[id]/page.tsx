import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KV, Numeral, Section } from "@/components/admin/shared";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Avatar, PageHeader, Stars, StatusChip } from "@/components/ui";
import { LISTING_STATUS, SELLER_STATUS } from "@/lib/catalog";
import { formatDate, formatDateTime, formatMoney, ratingOf } from "@/lib/utils";
import { approveApplicationAction, reinstateSellerAction, rejectApplicationAction, suspendSellerAction } from "@/server/actions/admin/applications";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await db.sellerProfile.findUnique({ where: { id }, select: { displayName: true } });
  return { title: p ? p.displayName : "Application" };
}

const TYPE_LABEL = { SELLER: "Seller", BOOSTER: "Booster", BOTH: "Seller and booster" } as const;

export default async function AdminApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const profile = await db.sellerProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, emailVerified: true, createdAt: true, banned: true } },
      listings: { orderBy: { updatedAt: "desc" }, take: 10, select: { id: true, title: true, status: true, price: true } },
      _count: { select: { listings: true, sales: true, boosts: true, reports: true, reviews: true } },
    },
  });
  if (!profile) notFound();
  const games = await db.game.findMany({ where: { slug: { in: profile.games } }, select: { slug: true, name: true } });
  const status = SELLER_STATUS[profile.status];
  const rating = ratingOf(profile.ratingSum, profile.ratingCount);
  const pending = profile.status === "PENDING";
  const defaultSell = profile.status === "APPROVED" ? profile.canSell : profile.applicationType !== "BOOSTER";
  const defaultBoost = profile.status === "APPROVED" ? profile.canBoost : profile.applicationType !== "SELLER";

  return (
    <>
      <PageHeader
        title={profile.displayName}
        description={`${TYPE_LABEL[profile.applicationType]} application · applied ${formatDate(profile.createdAt)}`}
        actions={
          <>
            <StatusChip tone={status.tone}>{status.label}</StatusChip>
            {profile.status === "APPROVED" ? (
              <Link href={`/sellers/${profile.slug}`} className="btn btn-ghost btn-sm">
                Public storefront <ExternalLink className="size-3.5" />
              </Link>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Section title="Application">
            <div className="mb-5 flex items-center gap-3">
              <Avatar name={profile.displayName} src={profile.avatarUrl} size={48} />
              <div>
                <p className="font-medium text-ink">{profile.displayName}</p>
                <p className="text-[0.8125rem] text-ink-3">/{profile.slug}</p>
              </div>
            </div>
            <KV
              items={[
                ["Applying as", TYPE_LABEL[profile.applicationType]],
                ["Country", profile.country],
                ["Discord", profile.discord],
                ["Games", games.map((g) => g.name).join(", ") || (profile.games.length ? profile.games.join(", ") : null)],
                ["Peak rank", profile.peakRank],
                ["Servers", profile.servers.join(", ")],
                [
                  "Proof",
                  profile.proofUrl ? (
                    <a key="p" href={profile.proofUrl} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-phosphor hover:underline">
                      {profile.proofUrl}
                    </a>
                  ) : null,
                ],
                ["Bio", profile.bio ? <span key="b" className="whitespace-pre-line">{profile.bio}</span> : null],
              ]}
            />
            {profile.experience ? (
              <div className="mt-5 rounded-[10px] border border-cab-4 bg-cab-3 p-4">
                <p className="mb-1.5 text-[0.8125rem] text-ink-3">Experience, in their words</p>
                <p className="text-sm whitespace-pre-line text-ink">{profile.experience}</p>
              </div>
            ) : null}
          </Section>

          <Section title="Account">
            <KV
              items={[
                [
                  "User",
                  <Link key="u" href={`/admin/users/${profile.user.id}`} className="text-phosphor hover:underline">
                    {profile.user.name}
                  </Link>,
                ],
                ["Email", `${profile.user.email}${profile.user.emailVerified ? "" : " (not verified)"}`],
                ["Joined", formatDateTime(profile.user.createdAt)],
                ["Banned", profile.user.banned ? <StatusChip key="ban" tone="bad">Banned</StatusChip> : "No"],
                ["Last decision", profile.reviewedAt ? formatDateTime(profile.reviewedAt) : null],
                ["Staff note", profile.reviewNote],
              ]}
            />
          </Section>

          {profile._count.listings ? (
            <Section title={`Listings (${profile._count.listings})`} actions={<Link href={`/admin/listings?seller=${profile.id}&status=ALL`} className="text-sm text-phosphor hover:underline">See all</Link>}>
              <ul className="divide-y divide-cab-4">
                {profile.listings.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/admin/listings/${l.id}`} className="min-w-0 truncate text-sm text-ink hover:text-phosphor">
                      {l.title}
                    </Link>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-sm text-ink-2 tnum">{formatMoney(l.price)}</span>
                      <StatusChip tone={LISTING_STATUS[l.status].tone}>{LISTING_STATUS[l.status].label}</StatusChip>
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>

        <div className="space-y-6">
          <Section title="Track record">
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[0.75rem] text-ink-3">Available</p>
                <Numeral className="text-3xl text-ink">{formatMoney(profile.balance)}</Numeral>
              </div>
              <div>
                <p className="text-[0.75rem] text-ink-3">In escrow</p>
                <Numeral className="text-3xl text-ink-2">{formatMoney(profile.pendingBalance)}</Numeral>
              </div>
            </div>
            <KV
              items={[
                ["Total earned", formatMoney(profile.totalEarned)],
                ["Completed orders", profile.completedOrders],
                ["Sales / boosts", `${profile._count.sales} / ${profile._count.boosts}`],
                ["Rating", rating ? <span key="r" className="inline-flex items-center gap-2"><Stars value={rating} /> {rating} ({profile.ratingCount})</span> : "No reviews"],
                ["Reports against", profile._count.reports],
              ]}
            />
          </Section>

          {profile.status === "PENDING" || profile.status === "APPROVED" ? (
            <Section title={pending ? "Approve" : "Permissions"} description={pending ? "Choose what this person may do." : "Turning selling off pauses their live listings."}>
              <ActionForm action={approveApplicationAction} className="space-y-4">
                <input type="hidden" name="id" value={profile.id} />
                <label className="flex items-center gap-3 text-sm text-ink">
                  <input type="checkbox" name="canSell" defaultChecked={defaultSell} className="size-4 accent-[#5cf2d6]" />
                  Can list items for sale
                </label>
                <label className="flex items-center gap-3 text-sm text-ink">
                  <input type="checkbox" name="canBoost" defaultChecked={defaultBoost} className="size-4 accent-[#5cf2d6]" />
                  Can claim boosting orders
                </label>
                <div>
                  <label htmlFor="approve-note" className="label">
                    Note to the applicant (optional)
                  </label>
                  <textarea id="approve-note" name="reviewNote" maxLength={1000} className="field min-h-20" placeholder="Welcome aboard! Start with…" />
                </div>
                <SubmitButton className={pending ? "btn-coin w-full" : "btn-ghost w-full"} pendingText="Saving…">
                  {pending ? "Approve application" : "Save permissions"}
                </SubmitButton>
              </ActionForm>
            </Section>
          ) : null}

          {pending ? (
            <Section title="Reject">
              <ActionForm action={rejectApplicationAction} className="space-y-3">
                <input type="hidden" name="id" value={profile.id} />
                <label htmlFor="reject-note" className="label">
                  Reason (sent to the applicant)
                </label>
                <textarea id="reject-note" name="reviewNote" required minLength={5} maxLength={1000} className="field min-h-20" placeholder="e.g. We couldn't verify the rank in your proof link." />
                <ConfirmButton className="btn-danger w-full" message="Reject this application?">
                  Reject application
                </ConfirmButton>
              </ActionForm>
            </Section>
          ) : null}

          {profile.status === "APPROVED" ? (
            <Section title="Suspend" description="Pauses every live listing and blocks the seller dashboard.">
              <ActionForm action={suspendSellerAction} className="space-y-3">
                <input type="hidden" name="id" value={profile.id} />
                <label htmlFor="suspend-note" className="label">
                  Reason (sent to the seller)
                </label>
                <textarea id="suspend-note" name="reviewNote" required minLength={5} maxLength={1000} className="field min-h-20" />
                <ConfirmButton className="btn-danger w-full" message={`Suspend ${profile.displayName}? Their listings will be paused.`}>
                  Suspend seller
                </ConfirmButton>
              </ActionForm>
            </Section>
          ) : null}

          {profile.status === "SUSPENDED" || profile.status === "REJECTED" ? (
            <Section title={profile.status === "SUSPENDED" ? "Reinstate" : "Approve after all"}>
              <ActionForm action={reinstateSellerAction}>
                <input type="hidden" name="id" value={profile.id} />
                <p className="mb-3 text-[0.8125rem] text-ink-3">Restores access. Paused listings stay paused until the seller resumes them.</p>
                <SubmitButton className="btn-coin w-full" pendingText="Saving…">
                  {profile.status === "SUSPENDED" ? "Reinstate seller" : "Approve"}
                </SubmitButton>
              </ActionForm>
            </Section>
          ) : null}
        </div>
      </div>
    </>
  );
}

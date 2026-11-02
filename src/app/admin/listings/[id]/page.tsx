import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KV, Numeral, Section } from "@/components/admin/shared";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { PageHeader, StatusChip } from "@/components/ui";
import { CATEGORIES, LISTING_STATUS, SELLER_STATUS } from "@/lib/catalog";
import { listingUrl } from "@/lib/urls";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { moderateListingAction } from "@/server/actions/admin/listings";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const l = await db.listing.findUnique({ where: { id }, select: { title: true } });
  return { title: l ? l.title : "Listing" };
}

export default async function AdminListingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      game: { select: { slug: true, name: true } },
      seller: { select: { id: true, displayName: true, status: true, canSell: true, completedOrders: true, user: { select: { email: true } } } },
      reports: { orderBy: { createdAt: "desc" }, take: 10, include: { reporter: { select: { email: true } } } },
      _count: { select: { orders: true } },
    },
  });
  if (!listing) notFound();
  const freeStock = listing.deliveryMethod === "INSTANT" ? await db.stockItem.count({ where: { listingId: id, orderId: null } }) : listing.stock;
  const status = LISTING_STATUS[listing.status];
  const attrs = listing.attributes && typeof listing.attributes === "object" && !Array.isArray(listing.attributes) ? Object.entries(listing.attributes as Record<string, unknown>) : [];
  const reviewable = listing.status === "PENDING" || listing.status === "REJECTED" || listing.status === "PAUSED";
  const sellerOk = listing.seller.status === "APPROVED" && listing.seller.canSell;

  return (
    <>
      <PageHeader
        title="Listing review"
        description={listing.title}
        actions={
          <>
            <StatusChip tone={status.tone}>{status.label}</StatusChip>
            {listing.status === "ACTIVE" ? (
              <Link href={listingUrl(listing)} className="btn btn-ghost btn-sm">
                View live <ExternalLink className="size-3.5" />
              </Link>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Section title="What buyers will see">
            {listing.images.length ? (
              <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {listing.images.map((src, i) => (
                  <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="block aspect-[4/3] overflow-hidden rounded-[10px] border border-cab-4 bg-cab-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Image ${i + 1}`} className="size-full object-cover" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="mb-5 text-sm text-ink-3">No images uploaded.</p>
            )}
            <h2 className="text-lg font-semibold text-ink">{listing.title}</h2>
            <p className="mt-3 text-sm whitespace-pre-line text-ink-2">{listing.description}</p>
            {attrs.length ? (
              <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {attrs.map(([k, v]) => (
                  <div key={k} className="rounded-[10px] border border-cab-4 bg-cab-3 px-3 py-2">
                    <dt className="text-[0.75rem] text-ink-3">{k}</dt>
                    <dd className="text-sm text-ink">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </Section>

          {listing.reports.length ? (
            <Section title={`Reports (${listing.reports.length})`} actions={<Link href="/admin/reports" className="text-sm text-phosphor hover:underline">Open reports</Link>}>
              <ul className="divide-y divide-cab-4">
                {listing.reports.map((r) => (
                  <li key={r.id} className="py-3">
                    <p className="text-sm text-ink">
                      {r.reason} <span className="text-ink-3">· {r.reporter.email} · {formatDateTime(r.createdAt)}</span>
                    </p>
                    {r.details ? <p className="mt-1 text-[0.8125rem] text-ink-2">{r.details}</p> : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>

        <div className="space-y-6">
          <Section title="Details">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-sm text-ink-3">Price{listing.unitLabel ? ` per ${listing.unitLabel}` : ""}</span>
              <Numeral className="text-[2.4rem] text-ink">{formatMoney(listing.price)}</Numeral>
            </div>
            <KV
              items={[
                ["Game", listing.game.name],
                ["Category", CATEGORIES[listing.category].label],
                ["Server", listing.server],
                ["Platform", listing.platform],
                ["Delivery", listing.deliveryMethod === "INSTANT" ? "Instant (pre-loaded stock)" : `Manual, about ${listing.deliveryTime} min`],
                ["Available stock", freeStock],
                ["Minimum quantity", listing.minQuantity > 1 ? listing.minQuantity : null],
                ["Sold / orders", `${listing.soldCount} / ${listing._count.orders}`],
                ["Views", listing.views],
                ["Created", formatDateTime(listing.createdAt)],
                ["Updated", formatDateTime(listing.updatedAt)],
                ["Rejection reason", listing.rejectionReason],
              ]}
            />
          </Section>

          <Section title="Seller">
            <KV
              items={[
                [
                  "Name",
                  <Link key="s" href={`/admin/applications/${listing.seller.id}`} className="text-phosphor hover:underline">
                    {listing.seller.displayName}
                  </Link>,
                ],
                ["Email", listing.seller.user.email],
                ["Status", <StatusChip key="st" tone={SELLER_STATUS[listing.seller.status].tone}>{SELLER_STATUS[listing.seller.status].label}</StatusChip>],
                ["Completed orders", listing.seller.completedOrders],
              ]}
            />
            {!sellerOk ? <p className="mt-3 text-[0.8125rem] text-warn">This seller can&apos;t sell right now, so the listing can&apos;t go live.</p> : null}
          </Section>

          <Section title="Moderation">
            <div className="space-y-5">
              {reviewable ? (
                <ActionForm action={moderateListingAction}>
                  <input type="hidden" name="id" value={listing.id} />
                  <input type="hidden" name="op" value="approve" />
                  <SubmitButton className="btn-coin w-full" disabled={!sellerOk} pendingText="Approving…">
                    Approve &amp; publish
                  </SubmitButton>
                </ActionForm>
              ) : null}

              {listing.status !== "REMOVED" && listing.status !== "REJECTED" ? (
                <ActionForm action={moderateListingAction} className="space-y-2">
                  <input type="hidden" name="id" value={listing.id} />
                  <input type="hidden" name="op" value="reject" />
                  <label htmlFor="reject-reason" className="label">
                    Send back with changes
                  </label>
                  <textarea id="reject-reason" name="reason" required minLength={5} maxLength={500} className="field min-h-20" placeholder="e.g. Remove the contact details from the description." />
                  <SubmitButton className="btn-ghost w-full" pendingText="Sending…">
                    Reject listing
                  </SubmitButton>
                </ActionForm>
              ) : null}

              {listing.status === "ACTIVE" ? (
                <ActionForm action={moderateListingAction}>
                  <input type="hidden" name="id" value={listing.id} />
                  <input type="hidden" name="op" value={listing.featured ? "unfeature" : "feature"} />
                  <SubmitButton className="btn-p2 w-full" pendingText="Saving…">
                    {listing.featured ? "Remove from featured" : "Feature on storefront"}
                  </SubmitButton>
                </ActionForm>
              ) : null}

              {listing.status !== "REMOVED" ? (
                <ActionForm action={moderateListingAction} className="space-y-2">
                  <input type="hidden" name="id" value={listing.id} />
                  <input type="hidden" name="op" value="remove" />
                  <input name="reason" maxLength={500} className="field" placeholder="Reason for removal (optional)" aria-label="Reason for removal" />
                  <ConfirmButton className="btn-danger w-full" message="Remove this listing from the marketplace?">
                    Remove listing
                  </ConfirmButton>
                </ActionForm>
              ) : (
                <p className="text-sm text-ink-3">This listing was removed. The seller can&apos;t restore it.</p>
              )}
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}

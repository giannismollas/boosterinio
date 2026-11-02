import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { ListingForm } from "@/components/seller/listing-form";
import { PageHeader, StatusChip } from "@/components/ui";
import { LISTING_STATUS } from "@/lib/catalog";
import { listingUrl } from "@/lib/urls";
import { formatDate } from "@/lib/utils";
import { clearStockAction, deleteListingAction, saveListingAction, toggleListingAction } from "@/server/actions/seller";
import { getGames } from "@/server/catalog";
import { db } from "@/server/db";
import { requireSeller } from "@/server/session";
import { getSettings } from "@/server/settings";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireSeller("sell");
  const { id } = await params;
  const listing = await db.listing.findUnique({ where: { id }, include: { game: { select: { slug: true, name: true } } } });
  if (!listing || listing.sellerId !== profile.id || listing.status === "REMOVED") notFound();

  const [games, settings, undelivered] = await Promise.all([
    getGames(),
    getSettings(),
    db.stockItem.count({ where: { listingId: listing.id, orderId: null } }),
  ]);
  // Keep the listing's game selectable even if staff deactivated it.
  const options = games.some((g) => g.id === listing.gameId)
    ? games
    : [...games, await db.game.findUniqueOrThrow({ where: { id: listing.gameId } })];

  const attributes =
    listing.attributes && typeof listing.attributes === "object" && !Array.isArray(listing.attributes)
      ? Object.fromEntries(Object.entries(listing.attributes as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "")]))
      : {};
  const st = LISTING_STATUS[listing.status];

  return (
    <>
      <PageHeader
        title="Edit listing"
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusChip tone={st.tone}>{st.label}</StatusChip>
            <span className="text-ink-3">
              Created {formatDate(listing.createdAt)} · {listing.soldCount} sold · {listing.views} views
            </span>
          </span>
        }
        actions={
          <>
            {listing.status === "ACTIVE" ? (
              <Link href={listingUrl({ slug: listing.slug, category: listing.category, game: listing.game })} className="btn btn-ghost">
                View live <ExternalLink className="size-4" />
              </Link>
            ) : null}
            <Link href="/seller/listings" className="btn btn-ghost">
              Back to listings
            </Link>
          </>
        }
      />

      {listing.status === "REJECTED" && listing.rejectionReason ? (
        <div className="mb-6 rounded-[12px] border border-bad/40 bg-bad/5 px-4 py-3 text-sm text-ink-2" role="status">
          Staff didn&apos;t approve this listing: <span className="text-ink">{listing.rejectionReason}</span> Fix it and save to send it back for review.
        </div>
      ) : listing.status === "PENDING" ? (
        <div className="mb-6 rounded-[12px] border border-warn/40 bg-warn/5 px-4 py-3 text-sm text-ink-2" role="status">
          This listing is waiting for staff review. Buyers will see it once it&apos;s approved.
        </div>
      ) : null}

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
        <ListingForm
          action={saveListingAction}
          approvalRequired={settings.requireListingApproval}
          undelivered={undelivered}
          games={options.map((g) => ({
            id: g.id,
            name: g.name,
            categories: g.categories,
            servers: g.servers,
            platforms: g.platforms,
            currencyName: g.currencyName,
          }))}
          initial={{
            id: listing.id,
            gameId: listing.gameId,
            category: listing.category,
            title: listing.title,
            description: listing.description,
            price: listing.price,
            deliveryMethod: listing.deliveryMethod,
            deliveryTime: listing.deliveryTime,
            stock: listing.stock,
            minQuantity: listing.minQuantity,
            unitLabel: listing.unitLabel,
            server: listing.server,
            platform: listing.platform,
            attributes,
            images: listing.images,
          }}
        />

        <aside className="space-y-4 xl:sticky xl:top-24">
          {listing.status === "ACTIVE" || listing.status === "PAUSED" ? (
            <div className="panel-flat p-4">
              <h2 className="font-medium text-ink">{listing.status === "ACTIVE" ? "Pause listing" : "Resume listing"}</h2>
              <p className="mt-1 text-[0.8125rem] text-ink-3">
                {listing.status === "ACTIVE" ? "Hide it from buyers without losing anything." : "Make it visible to buyers again."}
              </p>
              <ActionForm action={toggleListingAction} className="mt-3">
                <input type="hidden" name="id" value={listing.id} />
                <SubmitButton className="btn-ghost btn-sm w-full">{listing.status === "ACTIVE" ? "Pause" : "Resume"}</SubmitButton>
              </ActionForm>
            </div>
          ) : null}

          {listing.deliveryMethod === "INSTANT" && undelivered > 0 ? (
            <div className="panel-flat p-4">
              <h2 className="font-medium text-ink">Clear stock</h2>
              <p className="mt-1 text-[0.8125rem] text-ink-3">
                Remove all {undelivered} undelivered item{undelivered === 1 ? "" : "s"}. Items already sold stay with their orders.
              </p>
              <ActionForm action={clearStockAction} className="mt-3">
                <input type="hidden" name="id" value={listing.id} />
                <ConfirmButton className="btn-danger btn-sm w-full" message={`Remove ${undelivered} undelivered item(s)? This can't be undone.`}>
                  Clear undelivered stock
                </ConfirmButton>
              </ActionForm>
            </div>
          ) : null}

          <div className="panel-flat p-4">
            <h2 className="font-medium text-ink">Delete listing</h2>
            <p className="mt-1 text-[0.8125rem] text-ink-3">Removes it from the marketplace. Existing orders aren&apos;t affected.</p>
            <ActionForm action={deleteListingAction} className="mt-3">
              <input type="hidden" name="id" value={listing.id} />
              <input type="hidden" name="next" value="/seller/listings" />
              <ConfirmButton className="btn-danger btn-sm w-full" message={`Delete "${listing.title}"? This can't be undone.`}>
                Delete listing
              </ConfirmButton>
            </ActionForm>
          </div>
        </aside>
      </div>
    </>
  );
}

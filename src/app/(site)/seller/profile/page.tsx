import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { ImageUploader } from "@/components/image-uploader";
import { PageHeader, StatusChip } from "@/components/ui";
import { PAYOUT_METHODS, SELLER_STATUS } from "@/lib/catalog";
import { sellerUrl } from "@/lib/urls";
import { formatDate } from "@/lib/utils";
import { saveStoreProfileAction } from "@/server/actions/seller";
import { requireSeller } from "@/server/session";

export default async function StoreProfilePage() {
  const { profile } = await requireSeller();
  const st = SELLER_STATUS[profile.status];

  return (
    <>
      <PageHeader
        title="Store profile"
        description="How buyers see you on listings and your storefront."
        actions={
          <Link href={sellerUrl(profile.slug)} className="btn btn-ghost">
            View storefront <ExternalLink className="size-4" />
          </Link>
        }
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <ActionForm action={saveStoreProfileAction} className="space-y-6">
          <section className="panel-flat space-y-5 p-5 sm:p-6" aria-labelledby="pf-public">
            <h2 id="pf-public" className="t-display text-2xl text-ink uppercase">
              Public profile
            </h2>
            <div>
              <span className="label">Banner</span>
              <ImageUploader
                name="banner"
                initial={profile.bannerUrl ? [profile.bannerUrl] : []}
                max={1}
                folder="banners"
                aspect="aspect-[4/1]"
                hint="Shown across the top of your storefront. Wide images work best (1600 × 400). PNG, JPG or WebP, up to 5 MB."
              />
            </div>
            <div>
              <span className="label">Avatar</span>
              <div className="max-w-[12rem]">
                <ImageUploader
                  name="avatar"
                  initial={profile.avatarUrl ? [profile.avatarUrl] : []}
                  max={1}
                  folder="avatars"
                  aspect="aspect-square"
                  hint="Square, at least 256 × 256."
                />
              </div>
            </div>
            <div>
              <label htmlFor="displayName" className="label">
                Store name
              </label>
              <input id="displayName" name="displayName" className="field" defaultValue={profile.displayName} maxLength={32} required />
              <p className="mt-1.5 text-[0.8125rem] text-ink-3">
                Your storefront address stays <span className="text-ink-2">{sellerUrl(profile.slug)}</span> even if you rename the store.
              </p>
            </div>
            <div>
              <label htmlFor="bio" className="label">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                className="field min-h-28"
                defaultValue={profile.bio ?? ""}
                maxLength={600}
                placeholder="What you sell or the ranks you boost, your hours, and how fast you usually deliver."
              />
            </div>
          </section>

          <section className="panel-flat space-y-5 p-5 sm:p-6" aria-labelledby="pf-payout">
            <h2 id="pf-payout" className="t-display text-2xl text-ink uppercase">
              Default payout
            </h2>
            <p className="-mt-2 text-sm text-ink-3">Pre-fills the payout form in your wallet. Only staff see these details.</p>
            <div>
              <label htmlFor="payoutMethod" className="label">
                Method
              </label>
              <select id="payoutMethod" name="payoutMethod" className="field" defaultValue={profile.payoutMethod ?? ""}>
                <option value="">Not set</option>
                {PAYOUT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="payoutDetails" className="label">
                Details
              </label>
              <textarea
                id="payoutDetails"
                name="payoutDetails"
                className="field min-h-24"
                defaultValue={profile.payoutDetails ?? ""}
                maxLength={500}
                placeholder="PayPal email, IBAN with account holder name, or USDT (TRC20) address"
              />
            </div>
          </section>

          <SubmitButton className="btn-coin btn-lg" pendingText="Saving…">
            Save profile
          </SubmitButton>
        </ActionForm>

        <aside className="panel-flat space-y-4 p-5 text-sm">
          <div>
            <p className="text-ink-3">Status</p>
            <StatusChip tone={st.tone} className="mt-1.5">
              {st.label}
            </StatusChip>
          </div>
          <div>
            <p className="text-ink-3">Permissions</p>
            <p className="mt-1 text-ink-2">
              {[profile.canSell ? "Sell on the marketplace" : null, profile.canBoost ? "Claim boosting orders" : null].filter(Boolean).join(" · ") ||
                "None yet"}
            </p>
          </div>
          {profile.peakRank ? (
            <div>
              <p className="text-ink-3">Peak rank</p>
              <p className="mt-1 text-ink-2">{profile.peakRank}</p>
            </div>
          ) : null}
          <div>
            <p className="text-ink-3">Approved</p>
            <p className="mt-1 text-ink-2">{formatDate(profile.reviewedAt ?? profile.createdAt)}</p>
          </div>
          <p className="border-t border-cab-4 pt-4 text-[0.8125rem] text-ink-3">
            Need different permissions or games?{" "}
            <Link href="/support" className="text-phosphor underline">
              Contact support
            </Link>
            .
          </p>
        </aside>
      </div>
    </>
  );
}

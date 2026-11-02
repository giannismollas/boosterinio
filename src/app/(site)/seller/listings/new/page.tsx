import Link from "next/link";
import { ListingForm } from "@/components/seller/listing-form";
import { PageHeader } from "@/components/ui";
import { str } from "@/lib/utils";
import { saveListingAction } from "@/server/actions/seller";
import { getGames } from "@/server/catalog";
import { requireSeller } from "@/server/session";
import { getSettings } from "@/server/settings";

export default async function NewListingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSeller("sell");
  const sp = await searchParams;
  const [games, settings] = await Promise.all([getGames(), getSettings()]);
  const preset = games.find((g) => g.slug === str(sp.game));

  return (
    <>
      <PageHeader
        title="New listing"
        description="Describe exactly what the buyer gets. Clear titles and real screenshots sell faster and avoid disputes."
        actions={
          <Link href="/seller/listings" className="btn btn-ghost">
            Back to listings
          </Link>
        }
      />
      <ListingForm
        action={saveListingAction}
        approvalRequired={settings.requireListingApproval}
        initial={{ gameId: preset?.id }}
        games={games.map((g) => ({
          id: g.id,
          name: g.name,
          categories: g.categories,
          servers: g.servers,
          platforms: g.platforms,
          currencyName: g.currencyName,
        }))}
      />
    </>
  );
}

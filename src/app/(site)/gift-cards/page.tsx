import { CategoryHub, categoryHubMeta } from "@/components/category-hub";

export const dynamic = "force-dynamic";
export const metadata = categoryHubMeta("GIFT_CARD");

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CategoryHub category="GIFT_CARD" searchParams={await searchParams} />;
}

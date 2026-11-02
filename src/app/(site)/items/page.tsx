import { CategoryHub, categoryHubMeta } from "@/components/category-hub";

export const dynamic = "force-dynamic";
export const metadata = categoryHubMeta("ITEM");

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CategoryHub category="ITEM" searchParams={await searchParams} />;
}

import { CategoryHub, categoryHubMeta } from "@/components/category-hub";

export const dynamic = "force-dynamic";
export const metadata = categoryHubMeta("TOPUP");

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CategoryHub category="TOPUP" searchParams={await searchParams} />;
}

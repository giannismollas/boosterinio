import { CategoryHub, categoryHubMeta } from "@/components/category-hub";

export const dynamic = "force-dynamic";
export const metadata = categoryHubMeta("ACCOUNT");

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CategoryHub category="ACCOUNT" searchParams={await searchParams} />;
}

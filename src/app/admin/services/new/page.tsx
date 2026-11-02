import type { Metadata } from "next";
import { ServiceForm } from "@/components/admin/service-form";
import { PageHeader } from "@/components/ui";
import { str } from "@/lib/utils";
import { saveServiceAction } from "@/server/actions/admin/catalog";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/session";
import { serviceTemplates } from "../templates";

export const metadata: Metadata = { title: "New service" };

export default async function NewServicePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const games = await db.game.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, boostingEnabled: true } });
  const requested = str(sp.game);
  const lol = games.find((g) => g.name === "League of Legends");

  return (
    <>
      <PageHeader title="New service" description="Pick a calculator, adjust the template prices, and the configurator on the site builds itself from it." />
      <ServiceForm action={saveServiceAction} games={games} templates={serviceTemplates()} defaultGameId={games.some((g) => g.id === requested) ? requested : lol?.id} />
    </>
  );
}

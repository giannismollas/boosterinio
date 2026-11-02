import type { Metadata } from "next";
import { GameForm } from "@/components/admin/game-form";
import { PageHeader } from "@/components/ui";
import { saveGameAction } from "@/server/actions/admin/catalog";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "New game" };

export default async function NewGamePage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="New game" description="Add a game to the catalog. Its marketplace opens as soon as it's visible." />
      <GameForm action={saveGameAction} />
    </>
  );
}

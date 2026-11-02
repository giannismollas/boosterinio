import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameForm } from "@/components/admin/game-form";
import { Section } from "@/components/admin/shared";
import { PageHeader, StatusChip } from "@/components/ui";
import { saveGameAction } from "@/server/actions/admin/catalog";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const g = await db.game.findUnique({ where: { id }, select: { name: true } });
  return { title: g ? g.name : "Game" };
}

export default async function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const game = await db.game.findUnique({
    where: { id },
    include: { services: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true, isActive: true, calculator: true } } },
  });
  if (!game) notFound();

  return (
    <>
      <PageHeader
        title={game.name}
        description={`/${game.slug}`}
        actions={
          game.isActive ? (
            <Link href={`/${game.slug}`} className="btn btn-ghost btn-sm">
              View on site <ExternalLink className="size-3.5" />
            </Link>
          ) : null
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <GameForm
          action={saveGameAction}
          game={{
            id: game.id,
            name: game.name,
            slug: game.slug,
            shortName: game.shortName,
            publisher: game.publisher,
            description: game.description,
            color: game.color,
            imageUrl: game.imageUrl,
            categories: game.categories,
            currencyName: game.currencyName,
            platforms: game.platforms,
            servers: game.servers,
            isActive: game.isActive,
            isFeatured: game.isFeatured,
            boostingEnabled: game.boostingEnabled,
            sortOrder: game.sortOrder,
            seoTitle: game.seoTitle,
            seoDescription: game.seoDescription,
          }}
        />
        <div>
          <Section
            title="Boosting services"
            actions={
              <Link href={`/admin/services/new?game=${game.id}`} className="btn btn-ghost btn-sm">
                Add service
              </Link>
            }
          >
            {game.services.length ? (
              <ul className="divide-y divide-cab-4">
                {game.services.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/admin/services/${s.id}`} className="min-w-0 truncate text-sm text-ink hover:text-phosphor">
                      {s.name}
                    </Link>
                    {s.isActive ? <StatusChip tone="ok">Active</StatusChip> : <StatusChip tone="muted">Off</StatusChip>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">No services yet. Add one to start selling boosts for {game.name}.</p>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}

import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ServiceForm } from "@/components/admin/service-form";
import { Numeral, Section } from "@/components/admin/shared";
import { ActionForm, ConfirmButton } from "@/components/forms";
import { PageHeader, StatusChip } from "@/components/ui";
import { defaultSelection, formatEta, quoteService } from "@/lib/boosting/engine";
import { formatMoney } from "@/lib/utils";
import { deleteServiceAction, saveServiceAction } from "@/server/actions/admin/catalog";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/session";
import { serviceTemplates } from "../templates";

// Postgres stores JSON with sorted keys; show the editor in a readable order instead.
const KEY_ORDER = [
  "tiers", "divisionLabels", "lpBrackets", "lpGain", "packages", "rates", "bands", "unitLabel", "unitLabelPlural", "tierLabel", "subjectLabel",
  "min", "max", "defaultCount", "servers", "queues", "modes", "addons", "minPrice", "notesLabel",
  "id", "name", "label", "description", "divisions", "stepPrice", "unitPrice", "hourly", "price", "upTo", "multiplier", "pct", "flat", "discountPct", "etaHours", "defaultOn",
  "q", "a",
];

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === "object") {
    const rank = (k: string) => (KEY_ORDER.includes(k) ? KEY_ORDER.indexOf(k) : KEY_ORDER.length);
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort((a, b) => rank(a) - rank(b))
        .map((k) => [k, ordered((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = await db.boostService.findUnique({ where: { id }, select: { name: true } });
  return { title: s ? s.name : "Service" };
}

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [service, games] = await Promise.all([
    db.boostService.findUnique({ where: { id }, include: { game: { select: { slug: true, name: true, boostingEnabled: true } }, _count: { select: { orders: true } } } }),
    db.game.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, boostingEnabled: true } }),
  ]);
  if (!service) notFound();

  const selection = defaultSelection(service.calculator, service.config);
  const quote = selection ? quoteService({ calculator: service.calculator, config: service.config, name: service.name }, selection) : null;
  const live = service.isActive && service.game.boostingEnabled;

  return (
    <>
      <PageHeader
        title={service.name}
        description={`${service.game.name} · /${service.game.slug}/boosting/${service.slug}`}
        actions={
          <>
            {live ? <StatusChip tone="ok">Live</StatusChip> : <StatusChip tone="muted">Not live</StatusChip>}
            {live ? (
              <Link href={`/${service.game.slug}/boosting/${service.slug}`} className="btn btn-ghost btn-sm">
                Open configurator <ExternalLink className="size-3.5" />
              </Link>
            ) : null}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ServiceForm
          action={saveServiceAction}
          games={games}
          templates={serviceTemplates()}
          service={{
            id: service.id,
            gameId: service.gameId,
            name: service.name,
            slug: service.slug,
            tagline: service.tagline,
            imageUrl: service.imageUrl,
            description: service.description,
            calculator: service.calculator,
            config: JSON.stringify(ordered(service.config), null, 2),
            faq: JSON.stringify(ordered(service.faq ?? []), null, 2),
            isActive: service.isActive,
            sortOrder: service.sortOrder,
            seoTitle: service.seoTitle,
            seoDescription: service.seoDescription,
          }}
        />

        <div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <Section title="Test price" description="The default selection buyers see first, priced with the saved config.">
            {quote?.ok ? (
              <>
                <p className="text-[0.8125rem] text-ink-2">{quote.quote.summary}</p>
                <ul className="mt-3 divide-y divide-cab-4 text-sm">
                  {quote.quote.lines.map((l) => (
                    <li key={l.key} className="flex items-baseline justify-between gap-3 py-2">
                      <span className="text-ink-2">
                        {l.label}
                        {l.detail ? <span className="ml-1.5 text-[0.75rem] text-ink-3">{l.detail}</span> : null}
                      </span>
                      <span className="shrink-0 text-ink tnum">{l.amount === null ? "Free" : `${l.amount < 0 ? "−" : ""}${formatMoney(Math.abs(l.amount))}`}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-baseline justify-between border-t border-cab-4 pt-3">
                  <span className="text-sm text-ink-3">Total · {formatEta(quote.quote.etaHours)}</span>
                  <Numeral className="text-[2.4rem] text-phosphor">{formatMoney(quote.quote.total)}</Numeral>
                </div>
              </>
            ) : (
              <p className="text-sm text-bad">{quote && !quote.ok ? quote.error : "The saved config is invalid, so no price can be calculated."}</p>
            )}
          </Section>

          <Section title="Delete service" description={service._count.orders ? `${service._count.orders} past order(s) keep their details.` : "No orders use this service yet."}>
            <ActionForm action={deleteServiceAction}>
              <input type="hidden" name="id" value={service.id} />
              <p className="mb-3 text-[0.8125rem] text-ink-3">To hide it temporarily, untick Active instead.</p>
              <ConfirmButton className="btn-danger w-full" message={`Delete ${service.name}? Its page disappears from the site.`}>
                Delete service
              </ConfirmButton>
            </ActionForm>
          </Section>
        </div>
      </div>
    </>
  );
}

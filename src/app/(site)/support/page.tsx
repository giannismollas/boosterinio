import { ArrowRight, LifeBuoy, Mail, MessageCircle, Scale } from "lucide-react";
import Link from "next/link";
import { Container, Crumbs, Faq, SectionHead } from "@/components/storefront";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "Support",
  description: "Get help with a Boosterinio order, payment, boost or seller account. Open a ticket, email us or join our Discord.",
  path: "/support",
});

const QUICK = [
  { q: "My booster hasn't started yet", a: "Check that your account details are filled in on the order page. Most orders are claimed within an hour; if yours has waited longer, open a ticket with the order number." },
  { q: "I paid but the order still says unpaid", a: "Card and PayPal payments confirm within a minute. Crypto payments wait for blockchain confirmations, which can take 10–60 minutes depending on the coin." },
  { q: "The item isn't what was described", a: "Message the seller in the order chat first. If it isn't solved, open a dispute from the order page before the protection window ends; your payment stays frozen until staff decide." },
  { q: "How do I get paid as a seller?", a: "Completed orders move your earnings to your available balance. Request a payout from your seller wallet; staff process requests by PayPal, bank transfer or crypto." },
];

export default async function SupportPage() {
  const settings = await getSettings();
  const ways = [
    { icon: LifeBuoy, title: "Open a ticket", body: "Best for anything about an order. Staff reply in the ticket and by email.", href: "/dashboard/tickets/new", cta: "New ticket" },
    { icon: Scale, title: "Dispute an order", body: "Not delivered or not as described? Open a dispute from the order page to freeze the payment.", href: "/dashboard", cta: "My orders" },
    { icon: Mail, title: "Email us", body: `Write to ${site.supportEmail}. Include your order number if you have one.`, href: `mailto:${site.supportEmail}`, cta: "Send email" },
    ...(site.discordUrl ? [{ icon: MessageCircle, title: "Discord", body: "Chat with staff and the community.", href: site.discordUrl, cta: "Join Discord" }] : []),
  ];
  return (
    <Container className="py-10">
      <Crumbs items={[{ name: "Home", href: "/" }, { name: "Support" }]} />
      <h1 className="t-display text-5xl text-ink uppercase sm:text-6xl">Support</h1>
      <p className="mt-2 max-w-[60ch] text-ink-2">Real people answer every ticket. Support hours: {settings.supportHours}.</p>

      <div className="mt-8 grid gap-px overflow-hidden rounded-[16px] border border-cab-4 bg-cab-4 md:grid-cols-2">
        {ways.map((w) => (
          <div key={w.title} className="flex gap-4 bg-cab-2 p-6">
            <w.icon className="mt-0.5 size-5 shrink-0 text-phosphor" />
            <div>
              <h2 className="text-lg font-semibold text-ink">{w.title}</h2>
              <p className="mt-1 text-ink-2">{w.body}</p>
              <Link href={w.href} className="mt-3 inline-flex items-center gap-1.5 text-sm text-phosphor underline-offset-4 hover:underline">
                {w.cta} <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-16 grid gap-8 lg:grid-cols-[1fr_2fr]" aria-labelledby="quick-h">
        <SectionHead id="quick-h" title="Quick answers" className="lg:sticky lg:top-28">
          More in the <Link href="/faq" className="text-phosphor hover:underline">FAQ</Link>.
        </SectionHead>
        <Faq items={QUICK} />
      </section>
    </Container>
  );
}

import { JsonLd } from "@/components/json-ld";
import { Container, Crumbs, Faq, SectionHead } from "@/components/storefront";
import { faqLd, pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "FAQ: boosting, payments, escrow and selling",
  description: "Answers about Boosterinio: how boosting and escrow work, payment methods, refunds, account safety, and becoming a seller or booster.",
  path: "/faq",
});

export default async function FaqPage() {
  const s = await getSettings();
  const groups: { title: string; items: { q: string; a: string }[] }[] = [
    {
      title: "Buying",
      items: [
        { q: "How does escrow work?", a: `When you pay, ${site.name} holds the money. The seller or booster is paid only after you confirm the order, or automatically ${s.autoCompleteHours} hours after delivery if you haven't opened a dispute.` },
        { q: "Which payment methods do you accept?", a: "Cards, Apple Pay and Google Pay through Stripe, PayPal, and over 100 cryptocurrencies through NOWPayments, depending on what's available in your country." },
        { q: "Can I use a discount code?", a: "Yes. Enter it on the checkout page before you pay." },
        { q: "How do refunds work?", a: "If an order isn't delivered or isn't as described, open a dispute from the order page. Read the Refund Policy for details." },
      ],
    },
    {
      title: "Boosting",
      items: [
        { q: "What's the difference between solo and duo?", a: "Solo: the booster plays on your account. Duo: you play together on your own account and never share your password. Duo costs more because the booster spends their time with you." },
        { q: "Can I pause my boost?", a: "Yes, from the order page. The booster is notified straight away and must stop until you resume." },
        { q: "Who can see my login?", a: "Only the booster assigned to your order, while it is active. It's encrypted in our database, and staff can see it only when handling a dispute." },
        { q: "What if my booster is slow?", a: "Message them in the order chat. If an order stalls, open a ticket and staff can reassign it to another booster." },
      ],
    },
    {
      title: "Selling & boosting for money",
      items: [
        { q: "How do I become a seller or booster?", a: "Apply from the Sell page. Staff review your history and experience and reply by email." },
        { q: "What are the fees?", a: `Sellers keep ${100 - s.marketplaceFeePct}% of each sale. Boosters earn ${s.boosterPayoutPct}% of each boost they complete.` },
        { q: "When can I withdraw?", a: "Once an order completes, its earnings move to your available balance. Request a payout from your wallet; the minimum is shown there." },
      ],
    },
  ];
  return (
    <Container className="py-10">
      <JsonLd data={faqLd(groups.flatMap((g) => g.items))} />
      <Crumbs items={[{ name: "Home", href: "/" }, { name: "FAQ" }]} />
      <h1 className="t-display text-5xl text-ink uppercase sm:text-6xl">Frequently asked questions</h1>
      <div className="mt-10 space-y-14">
        {groups.map((g) => (
          <section key={g.title} className="grid gap-6 lg:grid-cols-[1fr_2fr]">
            <SectionHead title={g.title} className="lg:sticky lg:top-28" />
            <Faq items={g.items} />
          </section>
        ))}
      </div>
    </Container>
  );
}

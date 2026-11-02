import { site } from "@/lib/site";

/*
  Starter legal texts. They describe how the platform actually works, but they
  are templates: have them reviewed for your jurisdiction and fill in your
  company details (NEXT_PUBLIC_LEGAL_NAME, address, VAT) before launch.
*/

const name = site.name;
const company = site.legalName;
const email = site.supportEmail;

export const TERMS = `## 1. Who we are
${name} ("we", "us") is operated by ${company}. ${name} is a marketplace where independent, approved sellers and boosters ("Providers") offer game-related services and digital goods to buyers. Contact: ${email}.

## 2. Accounts
You must be at least 18 years old, or have permission from a parent or guardian, to use ${name}. Keep your login details safe; you are responsible for activity on your account. One person, one account.

## 3. Providers and approval
Sellers and boosters must apply and be approved by our staff before offering anything. Approval can be withdrawn at any time, for example after repeated disputes, fraud, or breaking these terms. Providers are independent; they are not our employees.

## 4. Orders and escrow
When you pay, your money is held by us in escrow. It is released to the Provider when you confirm the order, or automatically after the protection window shown on the order page if you have not opened a dispute. Prices shown at checkout include every option you selected.

## 5. Delivery
Marketplace items are delivered through the order page, either instantly from the seller's stock or by the seller by hand. Boosting orders start when a booster claims them. You agree to give accurate information (server, account details, in-game name) and to not play ranked on the same account while a solo boost is active unless you paused the order.

## 6. Disputes
If an order isn't delivered or isn't as described, open a dispute from the order page before the protection window ends. Our staff review the order chat and evidence, then refund you, release the payment to the Provider, or resume the order. Staff decisions on disputes are final on ${name}; this does not affect your statutory rights.

## 7. Prohibited use
You may not use ${name} to sell stolen or hacked accounts, cheats or bots, to launder money, to contact users to trade outside the platform, or to harass anyone. We may remove listings and suspend accounts that break these rules.

## 8. Game publishers
${name} is not affiliated with or endorsed by any game publisher. Some publishers' terms restrict account sharing, account sales or boosting. You are responsible for deciding whether to use these services with your game accounts.

## 9. Fees and payouts
Providers pay a platform fee shown in their dashboard. Earnings become withdrawable after the order completes and are paid by the method the Provider chooses, after any checks we need to prevent fraud.

## 10. Liability
We provide the platform "as is". To the extent the law allows, our liability for any order is limited to the amount you paid for it.

## 11. Changes
We may update these terms; the version on this page applies to orders placed after the update.`;

export const PRIVACY = `## What we collect
- **Account data:** name, email, password hash, sign-in sessions (IP address and browser).
- **Order data:** what you buy or sell, order chat, reviews, tickets, and payout details for Providers.
- **Game access you give a booster:** stored encrypted (AES-256-GCM) and shown only to the assigned booster while the order is active, and to staff when resolving a dispute.
- **Payments:** handled by Stripe, PayPal or NOWPayments. We receive payment status and a reference, never your full card number.

## Why we use it
To run your orders, protect buyers and Providers (escrow, disputes, fraud prevention), answer support requests, send order emails, and meet legal and accounting duties.

## Who we share it with
Payment providers, our hosting and database providers, our email provider, and the Provider handling your order (only what they need to deliver it). We don't sell personal data.

## How long we keep it
Account data while your account is open. Order and payment records for as long as accounting law requires. Encrypted game logins are deleted from active use when the order completes.

## Your rights
You can access, correct, export or delete your data, and object to processing, by emailing ${email}. If you are in the EU/EEA you may also complain to your data protection authority.

## Cookies
We use essential cookies to keep you signed in and secure. We don't use advertising cookies.`;

export const REFUNDS = `## When you get a full refund
- The order was never started: no booster claimed your boost, or the seller didn't deliver within the promised time.
- The item wasn't as described and the seller couldn't fix it.
- The booster stopped working on your order.

## Partial refunds
If a boost was partly completed (for example, two of four divisions), staff refund the unfinished part based on the order's own price breakdown.

## When refunds aren't possible
- After you confirmed the order, unless the seller misled you.
- When the problem was caused by information you gave incorrectly (wrong server, wrong login) and the work was already done.
- When you broke the terms during the order, for example by playing ranked during a solo boost without pausing it.

## How to ask
Open a dispute from the order page, or a support ticket that mentions the order number. Card and PayPal refunds go back to the original payment method within 5–10 business days. Crypto refunds are sent to an address you give us, in the same coin where possible, minus network fees.`;

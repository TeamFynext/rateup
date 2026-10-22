import type { RateupPaymentPlan } from "@/backend/payment/payment.api";

import { limitAnswer, resolvePack } from "./pricing.data.ts";

export interface FaqEntry {
  question: string;
  answer: string | string[];
}

const LIMIT_QUESTION = "What happens when I hit a limit?";

const faqs: FaqEntry[] = [
  {
    question: "What is a monthly active contact?",
    answer: `A contact you talk to one to one in a calendar month: anyone who messages you, or
        whom you message from the inbox, an automation, a flow, loyalty or the API. Each
        contact counts once a month, however many messages you exchange.`,
  },
  {
    question: "Do broadcasts count as active contacts?",
    answer: `No. Contacts who only receive your campaigns and broadcasts are free — those messages
        use campaign credits instead. If someone replies to a broadcast, they become an active
        contact for that month.`,
  },
  {
    question: "What are campaign credits?",
    answer: `One credit is one campaign message to one recipient, drip stages included. Failed
        sends and retries still use a credit. Your plan's credits refill every month, and
        credit packs are used after them.`,
  },
  {
    question: LIMIT_QUESTION,
    // Answer filled in from the catalog at render time — see buildFaqs below.
    answer: "",
  },
  {
    question: "Are WhatsApp message charges included?",
    answer: `No. Meta bills your own WhatsApp Business account directly for message fees and for
        the Meta Business AI agent. RateUp adds 0% markup — your subscription covers the
        platform only.`,
  },
  {
    question: "Can I try RateUp before paying?",
    answer: `Yes — the Free plan is free forever and needs no card. It covers the inbox,
      automations, templates, chatbots, campaigns and a shop that takes up to 50 orders a
      month, so you can run RateUp end to end before deciding whether Starter or Growth is
      worth it. Upgrade whenever you are ready; you are billed from the day you upgrade.`,
  },
  {
    question: "Which plan do you recommend for my business?",
    answer: [
      `Free → try the inbox, automations, campaigns and the shop end to end`,
      `Starter → small teams talking to customers every day, with loyalty and catalog sync`,
      `Growth → growing teams running regular campaigns`,
      `Scale → high-volume support and marketing across many teams`,
      `Enterprise → custom limits, contracted terms and a dedicated manager`,
    ],
  },
  {
    question: "Can I switch between annual and monthly?",
    answer: `Yes. Annual is the default and gives you two months free. You can switch either way
        from Settings → Billing. Depending on your payment method, the change starts right away or
        at your next renewal, and the new price applies from your next bill. Your monthly limits are the same on either cadence.`,
  },
  {
    question: "What payment methods do you accept?",
    answer: `Major credit/debit cards, UPI and eMandate are supported. Enterprise customers can
        request invoicing and bank transfers. UPI and eMandate are available for customers from
        India only.`,
  },
];

/**
 * The questions, with the limit answer priced from the live catalog.
 *
 * Exported so the pricing route can build its FAQ structured data from exactly what the
 * page renders — a rich result that contradicts the page is worse than none at all.
 */
export function buildFaqs(plans: RateupPaymentPlan[] | undefined, showPrices = true): FaqEntry[] {
  const answer = limitAnswer(
    { contacts: resolvePack(plans, "contacts"), credits: resolvePack(plans, "credits") },
    showPrices,
  );
  return faqs.map((entry) => (entry.question === LIMIT_QUESTION ? { ...entry, answer } : entry));
}

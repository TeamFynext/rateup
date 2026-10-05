import type { RateupPaymentPlan } from "@/backend/payment/payment.api";

import { conversationPackAnswer, resolveConversationPack } from "./pricing.data.ts";

export interface FaqEntry {
  question: string;
  answer: string | string[];
}

const faqs: FaqEntry[] = [
  {
    question: "What counts as a conversation?",
    answer: `One 24-hour messaging window with a customer on any connected channel. Every message
        inside that window — in either direction — counts once.`,
  },
  {
    question: "What if I run out of conversations?",
    // Answer filled in from the catalog at render time — see buildFaqs below.
    answer: "",
  },
  {
    question: "Are WhatsApp message charges included?",
    answer: `No. Meta bills your own WhatsApp Business account directly for message delivery. Your
        Rateup subscription covers the platform; we do not resell or mark up Meta's charges.`,
  },
  {
    question: "Can I try RateUp before paying?",
    answer: `Yes — the Free plan is free forever and needs no card. It covers the inbox,
      automations, templates and chatbots, so you can run RateUp end to end before deciding
      whether Plus or Pro is worth it. Upgrade whenever you are ready; you are billed
      from the day you upgrade.`,
  },
  {
    question: "Which plan do you recommend for my business?",
    answer: [
      `Free → test WhatsApp automation and campaigns end to end`,
      `Plus → growing shops that need real volume, loyalty and catalog sync`,
      `Pro → scaling teams past their first 10,000 conversations`,
      `Max → high-volume teams that want the Meta Business Agent in the loop`,
      `Enterprise → unlimited volume, contracted terms and a dedicated manager`,
    ],
  },
  {
    question: "Can I switch between annual and monthly?",
    answer: `Yes. Annual is the default and 20% cheaper. Move to monthly at renewal, or upgrade to
        annual any time and we'll pro-rate the difference.`,
  },
  {
    question: "What payment methods do you accept?",
    answer: `Major credit/debit cards, UPI and eMandate are supported. Enterprise customers can
        request invoicing and bank transfers. UPI and eMandate are available for customers from
        India only.`,
  },
];

/**
 * The questions, with the conversation-pack answer priced from the live catalog.
 *
 * Exported so the pricing route can build its FAQ structured data from exactly what the
 * page renders — a rich result that contradicts the page is worse than none at all.
 */
export function buildFaqs(plans: RateupPaymentPlan[] | undefined, showPrices = true): FaqEntry[] {
  const answer = conversationPackAnswer(resolveConversationPack(plans), showPrices);
  return faqs.map((entry) =>
    entry.question === "What if I run out of conversations?" ? { ...entry, answer } : entry,
  );
}

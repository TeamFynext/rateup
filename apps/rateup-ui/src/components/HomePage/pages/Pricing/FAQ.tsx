import { useMemo } from "react";

import type { RateupPaymentPlan } from "@/backend/payment/payment.api";

import { conversationPackAnswer, resolveConversationPack } from "./pricing.data.ts";

interface FaqEntry {
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
      whether Starter or Pro is worth it. Upgrade whenever you are ready; you are billed
      from the day you upgrade.`,
  },
  {
    question: "Which plan do you recommend for my business?",
    answer: [
      `Free → test WhatsApp automation end to end`,
      `Starter → growing shops running campaigns, loyalty and catalog sync`,
      `Pro → high-volume teams that want the Meta Business Agent in the loop`,
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
export function buildFaqs(plans: RateupPaymentPlan[] | undefined): FaqEntry[] {
  const answer = conversationPackAnswer(resolveConversationPack(plans));
  return faqs.map((entry) =>
    entry.question === "What if I run out of conversations?" ? { ...entry, answer } : entry,
  );
}

/**
 * The billing questions, as a plain read-through list rather than an accordion: every
 * answer here is short enough to read at a glance, and a visitor comparing plans should
 * not have to click each one open to find the one that applies to them.
 */
export function Faq({ plans }: Readonly<{ plans?: RateupPaymentPlan[] }>) {
  const entries = useMemo(() => buildFaqs(plans), [plans]);

  return (
    <section className="mx-auto max-w-[1240px] px-8 pt-18">
      <h2 className="font-display m-0 mb-2 text-[26px] font-bold leading-[1.12] tracking-[-0.028em] text-foreground md:text-[36px]">
        Billing questions
      </h2>
      <div className="max-w-[78ch]">
        {entries.map((entry) => (
          <div key={entry.question} className="border-b border-border py-5">
            <p className="font-display m-0 mb-1.5 text-[17px] font-medium leading-[1.35] text-foreground">
              {entry.question}
            </p>
            {Array.isArray(entry.answer) ? (
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[15px] leading-[1.6] text-muted-foreground">
                {entry.answer.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-[15px] leading-[1.6] text-muted-foreground">{entry.answer}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

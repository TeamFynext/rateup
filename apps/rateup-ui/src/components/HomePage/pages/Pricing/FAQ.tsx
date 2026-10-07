import { useMemo } from "react";

import type { RateupPaymentPlan } from "@/backend/payment/payment.api";

import { limitAnswer, resolvePack } from "./pricing.data.ts";

interface FaqEntry {
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
      automations, templates, chatbots and campaigns, so you can run RateUp end to end before
      deciding whether Starter or Growth is worth it. Upgrade whenever you are ready; you are
      billed from the day you upgrade.`,
  },
  {
    question: "Which plan do you recommend for my business?",
    answer: [
      `Free → try the inbox, automations and campaigns end to end`,
      `Starter → small teams talking to customers every day, with loyalty and catalog sync`,
      `Growth → growing teams running regular campaigns`,
      `Scale → high-volume support and marketing across many teams`,
      `Enterprise → custom limits, contracted terms and a dedicated manager`,
    ],
  },
  {
    question: "Can I switch between annual and monthly?",
    answer: `Yes. Annual is the default and gives you two months free. Move to monthly at renewal,
        or upgrade to annual any time and we'll pro-rate the difference. Your monthly limits are
        the same on either cadence.`,
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

/**
 * The billing questions, as a plain read-through list rather than an accordion: every
 * answer here is short enough to read at a glance, and a visitor comparing plans should
 * not have to click each one open to find the one that applies to them.
 */
export function Faq({
  plans,
  showPrices = true,
}: Readonly<{ plans?: RateupPaymentPlan[]; showPrices?: boolean }>) {
  const entries = useMemo(() => buildFaqs(plans, showPrices), [plans, showPrices]);

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

import { motion } from "motion/react";
import { useMemo } from "react";

import type { RateupPaymentPlan } from "@/backend/payment/payment.api";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion.tsx";
import { Badge } from "@/components/ui/badge.tsx";

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

export function Faq({ plans }: Readonly<{ plans?: RateupPaymentPlan[] }>) {
  const entries = useMemo(() => buildFaqs(plans), [plans]);

  const faqAccordion = entries.map((q) => (
    <motion.div
      key={q.question}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
    >
      <AccordionItem
        value={q.question}
        className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl my-2"
      >
        <AccordionTrigger className="group px-4 rounded-2xl transition-colors hover:bg-white/10 ">
          <p className="font-semibold text-white ">{q.question}</p>
        </AccordionTrigger>
        <AccordionContent className="px-4">
          {Array.isArray(q.answer) ? (
            <ul>
              {q.answer.map((ans) => (
                <li className="text-sm text-white" key={ans}>
                  {ans}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-white">{q.answer}</p>
          )}
        </AccordionContent>
      </AccordionItem>
    </motion.div>
  ));

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col gap-2 text-white items-center py-12"
    >
      <div className="flex flex-col items-center justify-center gap-4">
        <Badge className="px-3 py-1 text-sm">FAQs</Badge>
        <h3 className="text-2xl font-bold text-white mb-8">Frequently Asked Questions</h3>
      </div>

      <Accordion className="w-[85%]" defaultValue={[entries[0].question]}>
        {faqAccordion}
      </Accordion>
    </motion.div>
  );
}

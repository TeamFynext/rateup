import { motion } from "motion/react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion.tsx";
import { Badge } from "@/components/ui/badge.tsx";

const faqs = [
  {
    question: "Do you offer a free trial?",
    answer: `Absolutely! We provide a 14-day free trial for all the plans so you can explore all features before committing.
        We will be billed after the trial periods unless cancelled. Additionally we have a starter plan absolutely for free.`,
  },
  {
    question: "Which plan do you recommend for my business?",
    answer: [
      `Starter → testing & very small usage`,
      `Basic → small businesses just starting with WhatsApp engagement`,
      `Pro → growing teams needing automation and advanced insights`,
      `Enterprise → large businesses requiring high volumes and customization`,
    ],
  },
  {
    question: "Can I switch plans later?",
    answer: `Yes, you can upgrade, downgrade, or move to a custom enterprise setup anytime. Changes apply instantly.`,
  },
  {
    question: "What payment methods do you accept?",
    answer: `Major credit/debit cards/UPI/eMandate are supported. Enterprise customers can request invoicing and bank transfers. UPI and eMandats are available for customers from India only.`,
  },
];

export function Faq() {
  const faqAccordion = faqs.map((q) => (
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

      <Accordion className="w-[85%]" defaultValue={[faqs[0].question]}>
        {faqAccordion}
      </Accordion>
    </motion.div>
  );
}

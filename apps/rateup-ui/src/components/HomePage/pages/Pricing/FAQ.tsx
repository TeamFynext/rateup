import { Accordion, Badge, Stack, Title } from "@mantine/core";
import { motion } from "motion/react";

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
      <Accordion.Item
        key={q.question}
        value={q.question}
        className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl my-5"
      >
        <Accordion.Control className="hover:bg-white/10 transition-colors rounded-2xl hover:text-black group">
          <p className="font-semibold text-white hover:text-black group-hover:text-black">
            {q.question}
          </p>
        </Accordion.Control>
        <Accordion.Panel>
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
        </Accordion.Panel>
      </Accordion.Item>
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
      <Stack justify="center" align="center">
        <Badge size="lg" tt={"initial"}>
          FAQs
        </Badge>
        <Title order={3} c={"white"} mb={"xl"}>
          Frequently Asked Questions
        </Title>
      </Stack>

      <Accordion
        w={"85%"}
        transitionDuration={700}
        classNames={{ chevron: "text-white group-hover:text-black" }}
        defaultValue={faqs[0].question}
      >
        {faqAccordion}
      </Accordion>
    </motion.div>
  );
}

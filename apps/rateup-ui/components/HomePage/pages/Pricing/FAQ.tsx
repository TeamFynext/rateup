import { Accordion, Stack, Title } from "@mantine/core";

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

const FAQ = () => {
  const faqAccordion = faqs.map((q) => (
    <Accordion.Item key={q.question} value={q.question}>
      <Accordion.Control>
        <p className="font-semibold">{q.question}</p>
      </Accordion.Control>
      <Accordion.Panel>
        {Array.isArray(q.answer) ? (
          <ul>
            {q.answer.map((ans) => (
              <li className="text-sm" key={ans}>
                {ans}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">{q.answer}</p>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  ));

  return (
    <Stack
      align="center"
      bg={"var(--shade-of-blue)"}
      className="rounded-xl my-5"
      justify="center"
      p={"sm"}
      w={{ base: "90%", sm: "70%", md: "60%", lg: "60%" }}
    >
      <Title order={3} mb={"xl"}>
        Frequently Asked Questions
      </Title>
      <Accordion w={"100%"}>{faqAccordion}</Accordion>
    </Stack>
  );
};

export default FAQ;

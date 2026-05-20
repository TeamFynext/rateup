"use client";

import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion.tsx";

const faqs = [
  {
    question: "Is employee data secure and anonymous?",
    answer:
      "Absolutely. Security is our top priority. All communications are end-to-end encrypted. We provide options for fully anonymous feedback to ensure your employees feel safe to share honestly. All data is stored securely and complies with global privacy standards.",
  },
  {
    question: "Do our employees need to install anything?",
    answer:
      "No. That's the beauty of RateUp. It works directly through WhatsApp, which most employees already have on their phones. There are no new apps to download, no training required, and no complicated login processes.",
  },
  {
    question: "Can RateUp handle a company with multiple office locations?",
    answer:
      "Yes! Our platform is built for complexity. The Pro and Enterprise plans allow you to segment your employees by team, department, or physical location. Our unified dashboard lets you analyze feedback for your entire organization or drill down into specific segments to compare results and address localized issues.",
  },
  {
    question: "What kind of support do you offer?",
    answer:
      "We offer comprehensive support based on your plan. All customers get access to our knowledge base and email support. Pro and Enterprise plans include priority support, and Enterprise customers receive a dedicated account manager to help you achieve your engagement goals.",
  },
];

export const InboxFaq = () => {
  return (
    <section
      id="faq"
      className="py-28 px-4"
      style={{
        background:
          "linear-gradient(to bottom right, #00397b, #013553, #1c518e)",
      }}
    >
      <div className="container max-w-4xl mx-auto">
        <div className="mb-20 text-center flex flex-col items-center text-white">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="inline-block text-base tracking-wide uppercase font-semibold mb-4 bg-white/10 px-4 py-2 rounded-full"
          >
            FAQ
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold py-4 text-balance"
          >
            Frequently asked questions
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto"
          >
            Everything you need to know about our testimonial platform
          </motion.p>
        </div>

        <div className="space-y-6">
          <Accordion type="single" collapsible className="w-full text-white">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <AccordionItem
                  value={`item-${index}`}
                  className="border-b border-white/20"
                >
                  <AccordionTrigger className="cursor-pointer font-semibold py-6 hover:text-[#f8951d] transition-colors duration-200">
                    <span className="text-lg">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-white/80 text-base pb-5 px-1">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-white/70 text-sm">
            Have more questions?{" "}
            <Link to="#" className="text-[#f8951d] hover:underline">
              Contact our support team
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default InboxFaq;

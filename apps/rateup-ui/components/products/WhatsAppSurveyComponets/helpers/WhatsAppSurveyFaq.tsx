"use client";

import { motion } from "motion/react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { faqs } from "../WhatsAppSurveyConstants";

export function WhatsAppSurveyFaq() {
  return (
    <section
      id="faq"
      className="py-24 bg-gradient-to-b from-[#075E54] via-[#075E54] to-[#009987]"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12 flex flex-col justify-center items-center"
        >
          <div className="inline-block px-3 py-1 text-sm font-medium bg-white/10 text-white rounded-full mb-3">
            FAQ
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Have Questions? We've Got Answers.
          </h2>
          <p className="text-gray-200 pt-2 max-w-xl mx-auto">
            Find answers to common questions about RateUp and WhatsApp Surveys.
          </p>
        </motion.div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
            >
              <AccordionItem
                value={`item-${index}`}
                className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl overflow-hidden"
              >
                <AccordionTrigger className="flex cursor-pointer items-center justify-between w-full px-6 py-4 text-left text-lg font-semibold text-white hover:bg-white/10 transition-colors">
                  <span className="text-lg">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="bg-white/10 text-white/90 text-base px-6 pb-6 pt-2 leading-relaxed rounded-b-2xl">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

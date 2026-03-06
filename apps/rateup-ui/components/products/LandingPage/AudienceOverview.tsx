"use client";

import Image from "next/image";

import { motion } from "framer-motion";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { imagesPath } from "@/utils/constants";

import { accordionItems } from "./Constants";

export default function AudienceOverview() {
  return (
    <section className="w-full bg-linear-to-br from-[#F4F7F3] via-[#e8f1f887] to-[#F4F7F3] sm:pt-28 py-16 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto flex flex-col-reverse lg:flex-row items-center gap-16 lg:gap-20">
        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
          className="w-full lg:w-1/2 max-w-xl"
        >
          <span className="inline-block bg-white text-[#1c518e] px-4 py-1.5 rounded-full text-sm font-medium mb-5 shadow-sm">
            Your Complete Customer Engagement Solution
          </span>

          <h2 className="text-3xl md:text-5xl font-semibold text-[#22281E] mb-6 leading-tight">
            How RateUp Drives <br />
            Engagement Across <br />
            <span className="relative inline-block">
              <span className="absolute inset-x-0 bottom-1 h-3 bg-[#bcd3f4] z-0 rounded-sm" />
              <span className="relative z-10 text-[#1c518e]"> Industries</span>
            </span>
          </h2>

          <p className="text-gray-600 text-lg mb-8">
            RateUp's flexibility makes it suitable for diverse business sectors.
          </p>

          {/* Accordion */}
          <Accordion type="single" collapsible className="w-full space-y-3">
            {accordionItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white rounded-md shadow-none"
              >
                <AccordionTrigger className="p-4 cursor-pointer text-left text-lg font-medium text-[#1c518e] hover:underline focus:outline-none">
                  {item.title}
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 text-gray-600 text-sm">
                  {item.content}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* Right Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          viewport={{ once: true, amount: 0.3 }}
          className="w-full lg:w-1/2 flex justify-center"
        >
          <Image
            src={`${imagesPath}/DRIVES ENGAGEMENT.png`}
            alt="Post Scheduler Preview"
            width={520}
            height={360}
            className="w-full max-w-md lg:max-w-lg h-auto object-contain bg-[#F4F7F3] rounded-2xl"
          />
        </motion.div>
      </div>
    </section>
  );
}

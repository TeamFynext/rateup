"use client";

import { useState } from "react";
import Image from "next/image";

import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

import { imagesPath } from "@/utils/constants";

const accordionItems = [
  {
    id: "retail",
    title: "Retail & FMCG: Boost In-Store & Online Loyalty",
    content:
      "Track customer behavior, offer personalized promotions with in-store QR codes, and drive loyalty directly via WhatsApp, transforming in-store experiences into digital engagement.",
  },
  {
    id: "healthcare",
    title: "Healthcare: Enhance Patient Care & Feedback",
    content:
      "Collect patient feedback seamlessly, manage appointments, and run personalized campaigns to improve patient care and satisfaction through secure WhatsApp communications.",
  },
  {
    id: "hospitality",
    title: "Hospitality & Salons: Keep Customers Coming Back",
    content:
      "Provide instant feedback kiosks, automate promotions, and offer unique WhatsApp-based loyalty programs that keep customers returning for more.",
  },
  {
    id: "education",
    title: "Education & E-Learning: Streamline Communication",
    content:
      "Gather real-time feedback from students and automate WhatsApp notifications for course updates, assignments, and promotions, enhancing student engagement and retention.",
  },
];

export default function AudienceOverview() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setActiveIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="w-full bg-gradient-to-br from-[#F4F7F3] via-[#e8f1f887] to-[#F4F7F3] sm:pt-28 py-16 px-4 sm:px-8">
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

          <h2 className="text-3xl md:text-5xl font-semibold text-[#22281E] pb-3 leading-tight">
            How RateUp Drives <br />
            Engagement Across <br />
            <span className="relative inline-block">
              <span className="absolute inset-x-0 bottom-1 h-3 bg-[#bcd3f4] z-0 rounded-sm" />
              <span className="relative z-10 text-[#1c518e]">Industries</span>
            </span>
          </h2>

          <p className="text-gray-600 text-lg mb-8">
            RateUp's flexibility makes it suitable for diverse business sectors.
          </p>

          {/* Enhanced Accordion */}
          <div className="py-3 space-y-3 ">
            {accordionItems.map((item, index) => {
              const isOpen = activeIndex === index;
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl cursor-pointer  transition-all"
                >
                  <button
                    onClick={() => toggleAccordion(index)}
                    className="w-full flex justify-between cursor-pointer items-center px-5 py-4 text-left group"
                  >
                    <span className="text-[#1c518e] cursor-pointer font-medium text-base sm:text-lg group-hover:underline">
                      {item.title}
                    </span>
                    <span className="ml-4 transition-transform duration-300 ease-in-out">
                      {isOpen ? (
                        <ChevronUp className="text-[#1c518e]" size={22} />
                      ) : (
                        <ChevronDown className="text-[#1c518e]" size={22} />
                      )}
                    </span>
                  </button>

                  {/* Content */}
                  <motion.div
                    initial={false}
                    animate={{
                      height: isOpen ? "auto" : 0,
                      opacity: isOpen ? 1 : 0,
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden px-5"
                  >
                    {isOpen && (
                      <div className="pb-4 text-gray-600 text-sm sm:text-base leading-relaxed">
                        {item.content}
                      </div>
                    )}
                  </motion.div>
                </div>
              );
            })}
          </div>
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

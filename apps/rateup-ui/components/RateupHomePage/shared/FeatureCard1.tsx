"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { imagesPath } from "@/utils/constants";

type FeatureKey = "24/7 Chatbot" | "Loyalty Programs" | "WhatsApp Campaigns";
// | "QR Codes"
// | "";

const featureContent: Record<
  FeatureKey,
  {
    title?: string;
    description?: string;
    benefit?: string;
    image?: string;
    link?: string;
  }
> = {
  "24/7 Chatbot": {
    title: "24/7 AI Chatbot for Instant Support",
    description:
      "Provide round-the-clock support with our smart, multi-language AI chatbot, seamlessly integrated into WhatsApp and your website.",
    benefit:
      "Benefit: Deliver highly personalized experiences that truly connect, boosting customer loyalty and making your marketing efforts more effective.",
    image: `${imagesPath}/CHATBOT (3).png`,
    link: "https://rateup-homepage-dev.up.railway.app/products/ai-automation",
  },
  "Loyalty Programs": {
    title: "Loyalty Programs Your Customers Will Actually Use",
    description:
      "Forget physical cards and complex sign-ups. Your customers can join loyalty programs, earn points, and refer friends, all through a simple WhatsApp chat.",
    benefit:
      "Benefit: Watch your customer retention and word-of-mouth growth soar with loyalty programs that are easy and rewarding for everyone.",
    image: `${imagesPath}/LOYALTY PROGRAM (2).png`,
    link: "https://rateup-homepage-dev.up.railway.app/products/whatsapp-loyalty",
  },
  "WhatsApp Campaigns": {
    title: "Easy WhatsApp Marketing Campaigns",
    description:
      "Send personalized messages, promotions, and surveys directly on WhatsApp. Our simple drag-and-drop builder means you can create campaigns in minutes, no tech skills needed.",
    benefit:
      "Benefit: Your messages get seen and acted on, with incredibly high open and click rates, driving more sales and interactions.",
    image: `${imagesPath}/WHATSAPP CAMPAIGN.png`,
    link: "https://rateup-homepage-dev.up.railway.app/products/whatsapp-survey",
  },
};

export default function FeatureTabs() {
  const [activeTab, setActiveTab] = useState<FeatureKey>("24/7 Chatbot");
  const active = featureContent[activeTab];

  return (
    <section className="bg-white mt-12 sm:mt-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-12">
        {/* Section Header */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center text-[30px] sm:text-[45px] font-semibold text-[#1c518e]"
        >
          Your Complete <br />
          Customer Engagement Solution
        </motion.h2>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-300 overflow-x-auto">
          {(Object.keys(featureContent) as FeatureKey[]).map((key) => {
            const isActive = key === activeTab;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`pb-2 text-lg font-medium ${
                  isActive
                    ? "text-[#1c518e] border-b-2 border-[#1c518e]"
                    : "text-gray-500"
                }`}
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full">
          {/* Image */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active.image}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="relative w-full h-[250px] sm:h-[350px] md:h-[420px] rounded-xl overflow-hidden"
            >
              <Image
                src={active.image}
                alt={active.title}
                fill
                className="object-contain"
              />
            </motion.div>
          </AnimatePresence>

          {/* Text */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active.title}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
              className="space-y-4 text-center md:text-left"
            >
              <h3 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                {active.title}
              </h3>
              <p className="text-gray-600">{active.description}</p>
              <p className="text-sm sm:text-base font-medium text-[#1c518e]">
                {active.benefit}
              </p>
              <Link
                href={active.link}
                className="text-[#00397b] font-semibold text-lg hover:underline inline-flex items-center gap-1"
              >
                Let&apos;s find out <ArrowRight />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

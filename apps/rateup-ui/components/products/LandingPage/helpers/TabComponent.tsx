"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { AnimatePresence, motion } from "framer-motion";

import { imagesPath } from "@/utils/constants";

type TabKey = "AI-Workflows" | "Unified-Inbox" | "Automation" | "WhatsApp-Flow";

const tabContent: Record<
  TabKey,
  {
    title: string;
    description: string;
    image: string;
    link: string;
  }
> = {
  "AI-Workflows": {
    title: "AI Workflows",
    description:
      "Build intelligent conversational experiences that understand customer intent and respond with personalized solutions—no coding required.",
    image: `${imagesPath}/AI WORKFLOW (1).png`,
    link: "/products/ai-automation",
  },
  "Unified-Inbox": {
    title: "Unified Inbox",
    description:
      "Manage all customer conversations in one place with team collaboration tools, customer context cards, and AI-assisted responses.",
    image: `${imagesPath}/UNIFIED INBOX (1).png`,
    link: "/products/inbox",
  },
  Automation: {
    title: "Automation",
    description:
      "Design complex workflows with our intuitive drag-and-drop builder—trigger messages, assign tasks, and personalize responses automatically.",
    image: `${imagesPath}/AUTOMATION (1).png`,
    link: "/products/ai-automation",
  },
  "WhatsApp-Flow": {
    title: "WhatsApp Flow",
    description:
      "Create interactive applications like appointment booking, product browsing, and feedback collection without leaving WhatsApp.",
    image: `${imagesPath}/WHATSAPP FLOW (1).png`,
    link: "/products/whatsapp-loyalty",
  },
};

export default function TabComponent() {
  const [activeTab, setActiveTab] = useState<TabKey>("AI-Workflows");
  const active = tabContent[activeTab];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 bg-[]">
      {/* Tabs */}
      <div className="flex justify-center mb-12">
        <div className="w-full max-w-6xl">
          {/* Scroll wrapper */}
          <div className="bg-[#f6f4f2] rounded-2xl px-4 sm:px-8 py-6 overflow-x-auto scrollbar-hide">
            {/* Tabs container */}
            <div className="flex whitespace-nowrap gap-6 sm:gap-10 min-w-max justify-start sm:justify-between">
              {(Object.keys(tabContent) as TabKey[]).map((key) => {
                const isActive = key === activeTab;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`relative text-base sm:text-xl cursor-pointer font-bold transition-colors duration-200 ${
                      isActive ? "text-black" : "text-black"
                    }`}
                  >
                    {key.replace(/-/g, " ")}
                    {isActive && (
                      <span className="absolute left-0 -bottom-[6px] h-[3px] w-full bg-[#00397b] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        {/* Image */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active.image}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="relative w-full h-[300px] sm:h-[400px] md:h-[460px] rounded-xl overflow-hidden bg-gray-100"
          >
            <Image
              src={active.image}
              alt={active.title}
              fill
              quality={40}
              priority
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
            className="space-y-6"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-snug">
              {active.title}
            </h2>
            <p className="text-base sm:text-2xl text-gray-600">
              {active.description}
            </p>
            <Link
              href={active.link}
              className="text-[#00397b] font-semibold text-lg hover:underline
              sm:text-xl inline-flex items-center gap-1"
            >
              Let&apos;s find out →
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

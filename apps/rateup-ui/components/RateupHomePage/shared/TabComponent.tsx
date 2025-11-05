"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  IconArrowRight,
  IconAutomation,
  IconChartBar,
  IconMessages,
  IconUser,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";

import { imagesPath } from "@/utils/constants";

type TabKey =
  | "Smart Automation & AI Chatbot"
  | "Omnichannel Inbox"
  | "Customer Profiles & Retention AI"
  | "Feedback & Insights";

const tabContent: Record<
  TabKey,
  {
    Icon: any;
    title: string;
    description: string;
    image: string;
    link: string;
  }
> = {
  "Smart Automation & AI Chatbot": {
    Icon: IconAutomation,
    title: "Smart Automation & AI Chatbot",
    description:
      "Design complex workflows with our intuitive drag-and-drop builder to trigger messages, assign tasks, and personalize responses—while our smart multi-language AI chatbot delivers round-the-clock support across WhatsApp and your website.",
    image: `${imagesPath}/AI WORKFLOW (1).png`,
    link: "https://rateup-homepage-dev.up.railway.app/products/ai-automation",
  },
  "Omnichannel Inbox": {
    Icon: IconMessages,
    title: "Omnichannel Inbox",
    description:
      "Manage every customer interaction from one place. RateUp’s unified inbox keeps WhatsApp, Instagram, and other channels connected — enabling faster responses, seamless collaboration, and better customer experiences.",
    image: `${imagesPath}/UNIFIED INBOX (1).png`,
    link: "https://rateup-homepage-dev.up.railway.app/products/inbox",
  },
  "Customer Profiles & Retention AI": {
    Icon: IconUser,
    title: "Customer Profiles & Retention AI",
    description:
      "Unify customer data, predict churn, and power loyalty with AI that turns insights into retention strategies. RateUp helps you understand every interaction, predict what they need next, and engage them at the perfect moment",
    image: `${imagesPath}/AUTOMATION (1).png`,
    link: "https://rateup-homepage-dev.up.railway.app/products/ai-automation",
  },
  "Feedback & Insights": {
    Icon: IconChartBar,
    title: "Feedback & Insights",
    description:
      "Turn every message, survey, and chat into meaningful data. With AI-powered analysis, RateUp identifies satisfaction drivers, detects sentiment shifts, and delivers insights that boost customer experience and retention.",
    image: `${imagesPath}/WHATSAPP FLOW (1).png`,
    link: "https://rateup-homepage-dev.up.railway.app/products/whatsapp-loyalty",
  },
};

export default function TabComponent() {
  const [activeTab, setActiveTab] = useState<TabKey>(
    "Smart Automation & AI Chatbot",
  );
  const active = tabContent[activeTab];

  return (
    <div className="mx-auto px-4 sm:px-8 lg:px-12 sm:pt-14 py-6 bg-[#F5F5F5] flex items-center justify-center">
      <div className="w-full max-w-6xl flex flex-col items-center gap-12">
        {/* Heading */}
        <div className="flex flex-col items-center justify-center text-center gap-1 relative">
          {/* Title Line 1 */}
          <span className="text-2xl sm:text-3xl md:text-4xl text-[#343A40] font-semibold">
            Powerful Features For
          </span>

          {/* Title Line 2 with gradient + underline */}
          <div className="relative inline-block">
            <span className="relative z-10 bg-gradient-to-r from-[#001747] to-[#004F98] bg-clip-text text-transparent text-2xl sm:text-3xl md:text-4xl font-semibold">
              Modern Businesses
            </span>

            {/* Animated Underline */}
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute bottom-0 left-0 right-0 h-[6px] bg-gradient-to-r from-[#66D7FF] to-[#2D74E0] rounded-full origin-left"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-[#001747] flex flex-col items-center justify-center p-4 sm:p-6 rounded-3xl sm:rounded-4xl w-full">
          <div className="w-full">
            {/* Scroll wrapper */}
            <div className="px-2 sm:px-6 py-4 overflow-x-auto scrollbar-hide">
              {/* Tabs container */}
              <div className="relative flex whitespace-nowrap gap-4 sm:gap-8 min-w-max justify-start sm:justify-center border-b-2 border-[#004F98]">
                {(Object.keys(tabContent) as TabKey[]).map((key) => {
                  const { Icon } = tabContent[key];
                  const isActive = key === activeTab;
                  return (
                    <span
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`relative mb-2 text-md cursor-pointer font-medium transition-colors duration-200 ${
                        isActive ? "text-[#C4D7F5]" : "text-[#004F98]"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Icon />
                        {key.replace(/-/g, " ")}
                      </div>
                      {isActive && (
                        <span className="absolute left-0 -bottom-[8px] sm:-bottom-[10px] h-[3px] w-full bg-[#C4D7F5] rounded-full" />
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 items-center w-full px-2 sm:px-4">
            {/* Image */}
            <AnimatePresence mode="wait">
              <motion.div
                key={active.image}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="relative w-full h-[220px] sm:h-[300px] md:h-[400px] lg:h-[460px] rounded-xl overflow-hidden bg-gray-100"
              >
                <Image
                  src={active.image}
                  alt={active.title}
                  fill
                  quality={60}
                  priority
                  className="object-cover"
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
                className="text-center md:text-left px-2 flex flex-col gap-4"
              >
                <span className="text-2xl sm:text-3xl md:text-5xl text-white leading-snug">
                  {active.title}
                </span>
                <p className="text-xs sm:text-xs md:text-sm lg:text-base text-[#93C6F5] max-w-xl mx-auto md:mx-0">
                  {active.description}
                </p>
                <div className="flex items-center gap-4 w-full">
                  <Link
                    href={active.link}
                    className="text-white bg-rateup-gold font-semibold text-sm sm:text-lg hover:scale-105 inline-flex items-center gap-1 px-4 py-2 rounded-sm transition-all"
                  >
                    <div className="text-sm flex items-center justify-center">
                      Get Started Now <IconArrowRight />
                    </div>
                  </Link>

                  <button className="rounded-sm bg-rateup-blue font-semibold text-sm sm:text-lg hover:scale-105 px-4 py-2 text-white transition-all cursor-pointer">
                    Know More
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

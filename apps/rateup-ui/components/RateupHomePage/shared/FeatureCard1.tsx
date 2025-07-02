"use client";

import Image from "next/image";
import Link from "next/link";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import { imagesPath } from "@/utils/constants";

const features = [
  {
    title: "24/7 AI Chatbot for Instant Support",
    description:
      "Provide round-the-clock support with our smart, multi-language AI chatbot, seamlessly integrated into WhatsApp and your website.",
    benefit:
      "Benefit: Deliver highly personalized experiences that truly connect, boosting customer loyalty and making your marketing efforts more effective.",
    image: `${imagesPath}/CHATBOT (3).png`,
    link: "https://rateup-homepage-dev.up.railway.app/products/ai-automation",
    reverse: true,
  },
  {
    title: "Loyalty Programs Your Customers Will Actually Use",
    description:
      "Forget physical cards and complex sign-ups. Your customers can join loyalty programs, earn points, and refer friends, all through a simple WhatsApp chat.",
    benefit:
      "Benefit: Watch your customer retention and word-of-mouth growth soar with loyalty programs that are easy and rewarding for everyone.",
    image: `${imagesPath}/LOYALTY PROGRAM (2).png`,
    link: "https://rateup-homepage-dev.up.railway.app/products/whatsapp-loyalty",
    reverse: false,
  },
  {
    title: "Easy WhatsApp Marketing Campaigns",
    description:
      "Send personalized messages, promotions, and surveys directly on WhatsApp. Our simple drag-and-drop builder means you can create campaigns in minutes, no tech skills needed.",
    benefit:
      "Benefit: Your messages get seen and acted on, with incredibly high open and click rates, driving more sales and interactions.",
    image: `${imagesPath}/WHATSAPP CAMPAIGN.png`,
    link: "https://rateup-homepage-dev.up.railway.app/products/whatsapp-survey",
    reverse: true,
  },
];

export default function FeatureCards1() {
  return (
    <section className="bg-white mt-8 sm:mt-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-3 sm:space-y-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-[30px] sm:text-[45px]  text-[#1c518e] leading-tight">
            <span className="relative inline-block font-semibold">
              <span className="absolute -inset-x-2 bottom-0.5 h-3 bg-[#bcd6fc] z-0 rounded-sm" />
              <span className="relative z-10 text-[#1c518e]">
                {" "}
                Your Complete{" "}
              </span>
            </span>{" "}
            <br className="hidden sm:block" />
            <span className="font-semibold"> Customer Engagement Solution</span>
          </h2>
        </motion.div>

        {/* Feature Rows */}
        {features.map((feature, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              ease: "easeOut",
              delay: idx * 0.15,
            }}
            viewport={{ once: true }}
            className={`flex flex-col lg:flex-row ${
              feature.reverse ? "lg:flex-row-reverse" : ""
            } items-stretch gap-6 sm:gap-10 sm:gap-x-20 border-t-[1.5px] pt-3 sm:pt-2 sm:pb-6`}
          >
            {/* Image */}
            <div className="w-full lg:w-1/2 px-3.5 sm:px-0 flex items-center justify-center">
              <div className="w-full h-full overflow-hidden ">
                <Image
                  src={feature.image}
                  alt={`feature-${idx}`}
                  width={600}
                  height={520}
                  className="w-full h-full object-contain rounded-4xl"
                />
              </div>
            </div>

            {/* Text Content */}
            <div className="w-full lg:w-1/2 px-3.5 sm:px-0 flex items-center">
              <div className="min-h-[280px] sm:min-h-[360px] lg:min-h-[460px] xl:min-h-[520px] flex flex-col justify-center gap-y-4 sm:gap-y-8">
                {/* Step Number */}
                <p className="text-lg font-semibold text-[#1c518e]">
                  {String(idx + 1).padStart(2, "0")}.
                </p>

                <h3 className="text-xl sm:text-[36px] font-semibold text-black leading-tight mb-2 sm:mb-4">
                  {feature.title}
                </h3>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
                <Link
                  href={feature.link}
                  className="text-[#00397b] font-semibold text-lg hover:underline
              sm:text-xl inline-flex items-center gap-1"
                >
                  Let&apos;s find out <ArrowRight />
                </Link>

                {/* Benefit Box */}
                {/* Benefit Box */}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

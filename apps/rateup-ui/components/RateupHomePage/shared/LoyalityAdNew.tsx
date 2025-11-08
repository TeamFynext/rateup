"use client";

import { Sora } from "next/font/google";
import Image from "next/image";

import { IconArrowRight } from "@tabler/icons-react";
import { motion, type Variants } from "framer-motion";

import { imagePath } from "@/components/HomePage/pages/constants";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const leftVariants: Variants = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 140,
      damping: 18,
      mass: 1,
    },
  },
};

const rightVariants: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 140,
      damping: 18,
      mass: 1,
    },
  },
};

const btnHover = {
  y: -4,
  boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
  scale: 1.01,
};

export default function LoyaltyAd() {
  return (
    <motion.section
      className={`${sora.className} flex items-center justify-center w-full py-10 sm:py-16 bg-white`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.18 }}
      variants={containerVariants}
    >
      <motion.div
        className="flex flex-col lg:flex-row items-start justify-between w-full max-w-6xl border rounded-3xl sm:rounded-4xl pl-6 sm:pl-10 shadow-sm"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.06 } },
        }}
        whileHover={{ scale: 1.002 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        role="region"
        aria-label="Loyalty program ad"
      >
        {/* Left Content */}
        <motion.div
          className="flex flex-col gap-4 max-w-lg pt-6"
          variants={leftVariants}
        >
          <span className="text-4xl sm:text-5xl font-semibold text-rateup-graytext leading-tight">
            Loyalty That Drives <br className="hidden sm:block" /> Engagement
            And Growth
          </span>
          <p className="text-rateup-graytext text-sm leading-relaxed max-w-md font-medium">
            Turn every interaction into a lasting relationship. Build a loyalty
            program that keeps customers engaged, rewards them instantly, and
            fuels long-term business growth.
          </p>

          <motion.button
            className="inline-flex items-center justify-center bg-rateup-gold hover:bg-orange-600 text-white font-semibold px-3 py-1 rounded-sm w-fit transition-all gap-2"
            whileHover={btnHover}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            aria-label="Try for free"
          >
            <span className="text-sm font-semibold">Try For Free</span>
            <IconArrowRight className="h-6 w-6 text-white" />
          </motion.button>
        </motion.div>

        {/* Right Image Placeholder */}
        <motion.div
          className="rounded-r-3xl sm:rounded-r-4xl"
          variants={rightVariants}
        >
          <Image
            src={`${imagePath}/homepage/loyaltyad.png`}
            alt="loyalty"
            width={600}
            height={600}
            className="w-full h-auto object-contain rounded-r-3xl sm:rounded-r-4xl"
            priority
          />
        </motion.div>
      </motion.div>
    </motion.section>
  );
}

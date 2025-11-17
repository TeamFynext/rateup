"use client";

import Image from "next/image";

import {
  IconArrowRight,
  IconClock,
  IconCode,
  IconHeadphones,
} from "@tabler/icons-react";
import { motion, type Transition } from "motion/react";

import { imagePath } from "@/components/HomePage/pages/constants";
import { sora } from "@/utils/fonts";

// typed transition used for entry animations
const springUp: Transition = { type: "spring", stiffness: 120, damping: 18 };

export default function AutomateInteraction() {
  return (
    <motion.section
      className={`${sora.className} py-10 flex items-center justify-center px-4`}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={springUp}
    >
      <div className="flex flex-col items-center justify-center gap-6 max-w-6xl w-full">
        {/* Headings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...springUp, duration: 0.6 }}
          className="flex flex-col items-center justify-center gap-2 text-center"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-rateup-graytext leading-tight">
            Automate Every Customer Interaction
          </h2>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-rateup-graytext leading-tight">
            With RateUp AI Agents
          </h2>
        </motion.div>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.06, duration: 0.5 }}
          className="text-xs sm:text-sm lg:text-sm text-rateup-graytext max-w-xl text-center"
        >
          Turn every transaction, message, or support query into a real-time,
          AI-powered conversation that drives engagement, loyalty, and growth.
        </motion.p>

        {/* Badges */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {/* Badge 1 */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...springUp, delay: 0.08 }}
            className="inline-flex items-center bg-grey-color-5 rounded-full py-1 px-3 gap-2"
          >
            <div className="bg-rateup-graytext p-1 rounded-full flex justify-center items-center">
              <IconClock className="text-white h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="text-rateup-graytext text-xs sm:text-sm">
              <span className="font-semibold">10 Min</span> Setup Time
            </span>
          </motion.div>

          {/* Badge 2 */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...springUp, delay: 0.14 }}
            className="inline-flex items-center bg-grey-color-5 rounded-full py-1 px-3 gap-2"
          >
            <div className="bg-rateup-graytext p-1 rounded-full flex justify-center items-center">
              <IconCode className="text-white h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="text-rateup-graytext text-xs sm:text-sm">
              <span className="font-semibold">Zero</span> Code Needed
            </span>
          </motion.div>

          {/* Badge 3 */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...springUp, delay: 0.2 }}
            className="inline-flex items-center bg-grey-color-5 rounded-full py-1 px-3 gap-2"
          >
            <div className="bg-rateup-graytext p-1 rounded-full flex justify-center items-center">
              <IconHeadphones className="text-white h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="text-rateup-graytext text-xs sm:text-sm">
              <span className="font-semibold">24/7</span> Support
            </span>
          </motion.div>
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...springUp, delay: 0.26 }}
          className="flex items-center justify-center"
        >
          <motion.button
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex items-center justify-center gap-2 bg-rateup-gold rounded-md px-5 py-2 sm:px-6 sm:py-3 hover:opacity-90 transition hover:shadow-sm"
          >
            <span className="text-white text-sm  font-semibold">
              Launch In Minutes
            </span>
            <IconArrowRight className="h-4 w-4 text-white" />
          </motion.button>
        </motion.div>

        {/* Image */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...springUp, delay: 0.32 }}
        >
          <Image
            src={`${imagePath}/homepage/automateinteraction.svg`}
            alt="automate interaction"
            width={600}
            height={600}
            className="w-full h-auto object-contain  sm:rounded-r-4xl"
            priority
          />
        </motion.div>
      </div>
    </motion.section>
  );
}

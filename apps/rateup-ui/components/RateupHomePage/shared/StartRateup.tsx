"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { IconClockX, IconCreditCardOff } from "@tabler/icons-react";
import { motion, Transition } from "motion/react";

import { imagePath } from "@/components/HomePage/pages/constants";
import { Separator } from "@/components/ui/separator";
import { sora } from "@/utils/fonts";

import { BookDemoModal } from "../helpers/BookDemoModal";

const heroGraphic = `${imagePath}/homepage/GRAPHICS.png`;

const benefits = [
  "Increase Revenue",
  "Save Time",
  "Build Loyalty",
  "Boost Conversions",
];

const looped = [...benefits, ...benefits];

// Smooth spring transition for content
const springUp: Transition = { type: "spring", stiffness: 120, damping: 16 };

export default function StartRateupHero() {
  const router = useRouter();
  return (
    <motion.section
      className={`${sora.className} w-full flex items-center justify-center py-8 sm:py-10 bg-white`}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={springUp}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-[95%] max-w-6xl rounded-4xl overflow-hidden bg-rateup-darkblue shadow-md"
      >
        {/* Smooth pulsing background image */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{
            duration: 8, // slow, subtle
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Image
            src={heroGraphic}
            alt="hero graphic"
            fill
            className="object-contain object-left"
            priority
            quality={60}
          />
        </motion.div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center py-12 px-4 sm:py-16 sm:px-8 gap-8">
          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springUp}
            className="flex flex-col items-center justify-center gap-3"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white leading-snug">
              Start Engaging Smarter
            </h1>

            <div className="flex flex-col items-center justify-center gap-2">
              <span className="font-semibold block bg-linear-to-r from-rateup-blue-3 to-rateup-blue-2 bg-clip-text text-transparent text-3xl sm:text-4xl md:text-5xl">
                with RateUp
              </span>

              {/* Underline animation */}
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="h-[6px] w-40 sm:w-60 rounded-full bg-rateup-light-blue"
              />
            </div>
          </motion.div>

          {/* Scrolling highlights */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, ...springUp }}
            className="w-full flex items-center justify-center"
          >
            <div className="relative flex items-center justify-center bg-[linear-gradient(to_right,#001747,#004F98,#001747)] rounded-full overflow-hidden max-w-[25vw] min-w-[250px] py-2 px-2">
              <motion.div
                className="flex gap-4 min-w-max items-center"
                animate={{ x: ["0%", "-50%"] }}
                transition={{
                  duration: 25,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                {looped.map((label, idx) => (
                  <div
                    key={`${label}-${idx}`}
                    className="inline-flex items-center gap-2 px-4 py-1 text-[10px] sm:text-xs text-rateup-light-blue-3"
                  >
                    <span className="h-2 w-2 rounded-full bg-active-green-3" />
                    <span>{label}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>

          {/* CTA buttons + features */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, ...springUp }}
            className="flex flex-col items-center justify-center gap-4"
          >
            {/* CTA buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 250, damping: 18 }}
                className="bg-rateup-blue hover:bg-rateup-darkblue-2 transition px-4 py-2 rounded-sm text-white font-semibold text-sm sm:text-base"
                onClick={() => router.push("/signup")}
              >
                Start Free Trial
              </motion.button>
              <BookDemoModal>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 250, damping: 18 }}
                  className="bg-rateup-gold hover:bg-rateup-orange transition px-4 py-2 rounded-sm text-white font-semibold text-sm sm:text-base"
                >
                  Book A Demo
                </motion.button>
              </BookDemoModal>
            </div>

            <Separator className="max-w-[20vw] bg-rateup-blue" />

            {/* Feature icons */}
            <div className="flex items-center justify-center gap-8 sm:gap-10">
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-rateup-light-blue-3">
                <IconCreditCardOff className="text-rateup-blue-2" />
                No Credit Card
              </div>
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-rateup-light-blue-3">
                <IconClockX className="text-rateup-blue-2" />
                No Expiry
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.section>
  );
}

import { Sora } from "next/font/google";
import Image from "next/image";

import { IconCheck, IconClockX, IconCreditCardOff } from "@tabler/icons-react";
import { motion } from "framer-motion";

import { imagePath } from "@/components/HomePage/pages/constants";
import { Separator } from "@/components/ui/separator";

import { BookDemoModal } from "../helpers/BookDemoModal";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const heroGraphic = `${imagePath}/homepage/GRAPHICS.png`;

const benefits = [
  "Increase Revenue",
  "Save Time",
  "Build Loyalty",
  "Boost Conversions",
];

const looped = [...benefits, ...benefits];

export default function StartRateupHero() {
  return (
    <section
      className={`${sora.className} w-full flex items-center justify-center py-8 sm:py-10`}
    >
      <div className="relative w-[95%] max-w-6xl rounded-4xl overflow-hidden bg-rateup-darkblue">
        {/* Background image */}
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src={heroGraphic}
            alt="hero graphic"
            fill
            className="object-contain object-left"
            priority
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center py-12 px-4 sm:py-16 sm:px-8 gap-8">
          {/* Headline */}
          <div className="flex flex-col items-center justify-center gap-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white leading-snug">
              Start Engaging Smarter
            </h1>

            <div className="flex flex-col items-center justify-center gap-2">
              <span className="font-semibold block bg-gradient-to-r from-[#66D7FF] to-[#2D74E0] bg-clip-text text-transparent text-3xl sm:text-4xl md:text-5xl">
                with RateUp
              </span>

              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-[6px] w-40 sm:w-60 rounded-full bg-[#C4D7F5]"
              />
            </div>
          </div>
          {/* Highlight bar */}
          <div className="w-full flex items-center justify-center">
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
                    className="inline-flex items-center gap-2 px-4 py-1 text-[10px] sm:text-xs text-[#bcd8ff]"
                  >
                    <span className="h-2 w-2 rounded-full bg-[#36d07e]" />
                    <span>{label}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4">
            {/* CTA buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button className="bg-rateup-blue hover:bg-[#0b4d95] transition px-4 py-2 rounded-sm text-white font-semibold text-sm sm:text-base">
                Start Free Trial
              </button>
              <BookDemoModal>
                <button className="bg-rateup-gold hover:bg-[#d46c00] transition px-4 py-2 rounded-sm text-white font-semibold text-sm sm:text-base">
                  Book A Demo
                </button>
              </BookDemoModal>
            </div>

            <Separator className="max-w-[20vw] bg-rateup-blue" />

            {/* Feature icons */}
            <div className="flex items-center justify-center gap-8 sm:gap-10">
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-[#cfe8ff]">
                <IconCreditCardOff className="text-[#2D74E0]" />
                No Credit Card
              </div>
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-[#cfe8ff]">
                <IconClockX className="text-[#2D74E0]" />
                No Expiry
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

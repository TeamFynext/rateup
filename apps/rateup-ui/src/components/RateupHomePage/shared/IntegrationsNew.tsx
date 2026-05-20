import { Image } from "@unpic/react";
import type { Transition, Variants } from "motion/react";
import { motion } from "motion/react";

import { imagePath } from "@/components/HomePage/pages/constants.tsx";
import { sora } from "@/utils/fonts.ts";

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const springUp: Transition = { type: "spring", stiffness: 120, damping: 16 };
const springBtn: Transition = { type: "spring", stiffness: 260, damping: 24 };

const illustrationVariant: Variants = {
  hidden: { opacity: 0, y: -30 },
  visible: { opacity: 1, y: 0, transition: springUp },
};

const contentVariant: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: springUp },
};

const btnHover = {
  y: -4,
  scale: 1.02,
  boxShadow: "0 10px 24px rgba(10,20,50,0.08)",
};

export default function Integration() {
  return (
    <motion.section
      className={`${sora.className} bg-rateup-darkblue w-full flex items-center justify-center py-12 px-4`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
      variants={container}
    >
      <div className="max-w-6xl w-full flex flex-col items-center gap-2">
        {/* Top illustration / flow graphic */}
        <motion.div
          className="relative w-full flex items-center justify-center"
          variants={illustrationVariant}
        >
          {/* Background Illustration */}
          <div className="w-full rounded-t-2xl overflow-hidden bg-rateup-light-blue p-10">
            <Image
              src={`${imagePath}/homepage/Integrationssvg.svg`}
              alt="Integrations flow illustration"
              width={1600}
              height={420}
              className="w-full h-auto object-cover"
              priority
            />
          </div>

          {/* Animated Icon (centered & pulsing) */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[30px] w-[30px] sm:h-[40px] sm:w-[40px] lg:w-[75px] lg:h-[75px]"
            animate={{
              scale: [1, 1.25, 1, 1.15, 1], // heartbeat pattern
            }}
            transition={{
              duration: 1.8, // one heartbeat cycle
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "loop",
            }}
          >
            <Image
              src={`${imagePath}/homepage/rateupiconblue.svg`}
              alt="Rateup Icon"
              layout="fullWidth"
              aspectRatio={1}
              objectFit="contain"
              className="object-contain"
              priority
            />
          </motion.div>
        </motion.div>

        {/* Card-like content area */}
        <motion.div
          className="w-full bg-rateup-darkblue-2 rounded-b-2xl px-6 py-10 sm:px-12 sm:py-14 flex flex-col items-center justify-center gap-4 text-center"
          variants={contentVariant}
        >
          <h2 className="text-white text-2xl sm:text-3xl md:text-4xl font-normal leading-tight max-w-5xl">
            Build Your Business With Favorite Integrations
          </h2>

          <p className="text-rateup-light-blue-2 text-sm max-w-3xl">
            Our software seamlessly integrates with internal CRM systems,
            streamlining data management, optimizing internal data use, and
            increasing productivity and profitability through a more efficient
            workflow.
          </p>

          <motion.button
            type="button"
            className="inline-flex items-center justify-center bg-rateup-blue text-white font-medium px-4 py-2 rounded-sm shadow-sm hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rateup-blue-2 transition"
            whileHover={btnHover}
            transition={springBtn}
            aria-label="View all integrations"
          >
            <span className="text-sm font-normal">View All Integrations</span>
          </motion.button>
        </motion.div>
      </div>
    </motion.section>
  );
}

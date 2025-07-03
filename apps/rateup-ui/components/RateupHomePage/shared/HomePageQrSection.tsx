"use client";

import Image from "next/image";

import { motion } from "motion/react";

import { imagesPath } from "@/utils/constants";

export default function HomePageQrSection() {
  return (
    <section className="relative bg-[linear-gradient(270deg,#004F98_0%,#001C57_100%)] pt-28 px-4 overflow-hidden">
      {/* Main Content */}
      <div className="max-w-5xl mx-auto flex flex-col items-center text-center relative z-10 px-4">
        <motion.h2
          className="text-white text-3xl md:text-5xl lg:text-6xl font-bold leading-tight pb-16 tracking-tight"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          Know Your Customers & Grow Your Business
          <span className="text-[#CFE6FF]"> with RateUp</span>
        </motion.h2>

        <motion.div
          className="relative w-full max-w-5xl overflow-hidden"
          animate={{ y: [0, -20, 0] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
          }}
        >
          <Image
            src={`${imagesPath}/DASHBOARD%20(1).png`}
            alt="Smart QR Code Showcase"
            width={900}
            height={700}
            className="w-full h-auto object-contain pb-16"
            priority
          />
        </motion.div>
      </div>
    </section>
  );
}

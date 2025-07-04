"use client";

import Image from "next/image";

import { motion } from "motion/react";

import { imagesPath } from "@/utils/constants";

import CounterSection from "../helpers/CounterSection";

export default function HeroAnalytics() {
  return (
    <section
      className="relative text-white py-14  px-6 overflow-hidden"
      style={{
        background: "linear-gradient(270deg, #004F98 0%, #001C57 100%)",
      }}
    >
      {/* Left SVG */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          rotate: [0, 0, 0, 360, 0], // occasional spin
        }}
        transition={{
          y: {
            duration: 1.5,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          },
          rotate: {
            duration: 6, // one spin every 15 seconds
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
        className="absolute left-0 top-5 w-64 h-64 opacity-55"
      >
        <Image
          src={`${imagesPath}/rateup-star-blue.svg`}
          alt="Star Accent"
          width={256}
          height={256}
        />
      </motion.div>

      {/* Right SVG */}
      <svg
        className="absolute right-0 bottom-0 w-64 h-64 opacity-10"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="200" cy="200" r="100" fill="#FFFFFF" />
      </svg>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-start relative z-10">
        {/* Left Section */}
        <div>
          <span className="bg-white/10 text-white text-sm font-semibold px-4 py-1 rounded-full inline-block">
            Customer Data Platform
          </span>
          <h1 className="text-3xl md:text-5xl font-bold mt-6 leading-tight">
            Power Up Your <br /> WhatsApp Strategy
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-xl">
            From gathering real-time feedback to building intelligent customer
            profiles, RateUp helps create meaningful, measurable relationships
            with your customers.
          </p>
        </div>

        <CounterSection />
      </div>

      {/* Stats Section */}
    </section>
  );
}

"use client";

import React from "react";
import Image from "next/image";

import { motion } from "framer-motion";
import { SiMeta } from "react-icons/si";

import { imagesPath } from "@/utils/constants";

import { BookDemoModal } from "../helpers/BookDemoModal";
import VideoPlayer from "../helpers/VideoPlayer";

export default function HeroSection() {
  return (
    <section
      role="banner"
      aria-label="Marketing hero"
      className="relative isolate overflow-hidden bg-[#f4f7f3] flex items-center"
    >
      {/* Decorative Avatars */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="pointer-events-none absolute bottom-0 left-36 hidden xl:block"
      >
        <Image
          src={`${imagesPath}/USER 1 (1).png`}
          alt="user1"
          width={244}
          height={520}
          priority
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="pointer-events-none absolute bottom-2 left-14 hidden xl:block"
      >
        <Image
          src={`${imagesPath}/USER 2 (1).png`}
          alt="user"
          width={168}
          height={130}
          priority
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.8 }}
        className="pointer-events-none absolute right-16 bottom-0 hidden xl:block"
      >
        <Image
          src={`${imagesPath}/USER 4 (1).png`}
          alt="user"
          width={213}
          height={482}
          priority
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="pointer-events-none absolute right-56 bottom-0 hidden xl:block"
      >
        <Image
          src={`${imagesPath}/USER 3 (1).png`}
          alt="user"
          width={166}
          height={166}
          priority
        />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}

          <span
            className="inline-flex items-center mb-3.5 gap-2 rounded-full
           bg-white/60 px-4 py-1.5 text-sm font-semibold
            text-emerald-950 ring-1 ring-emerald-800/20 backdrop-blur"
          >
            <SiMeta className="h-5 w-6 text-blue-900" />
            Meta Business Partner
          </span>

          {/* Heading */}
          <h1
            className="relative mt-6 font-display text-4xl font-medium leading-tight 
          tracking-tight text-[#22281E] sm:text-5xl md:text-6xl"
          >
            <span className="relative inline-block">
              <motion.span
                aria-hidden
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-x-0 bottom-1 h-2 sm:h-4 rotate-[-1deg] 
                rounded-sm bg-[#3f5ba9] origin-left"
              />
              <span className="relative z-10">Transform</span>
            </span>{" "}
            WhatsApp into Your Brand's Most Valuable Channel
            <Image
              src={`${imagesPath}/rateup-star-blue.svg`}
              alt="Star Accent"
              width={40}
              height={40}
              className="absolute -right-8 -top-3 h-8 w-8 md:h-10 md:w-10"
            />
          </h1>

          {/* Subheadline */}
          <p className="mt-8 sm:pt-1 pt-3 text-xl leading-relaxed text-gray-700">
            Build deeper customer relationships with personalized conversations,
            smart automation, and actionable insights all through WhatsApp.
          </p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="mt-10 flex items-center justify-center gap-4 "
          >
            <BookDemoModal>
              <button
                className="text-white px-6 cursor-pointer sm:px-7 py-3 sm:py-3
                 text-base sm:text-lg font-semibold rounded-md bg-gradient-to-r from-[#00397b]
                  via-[#1c518e] to-[#3f5ba9] hover:opacity-90"
                aria-label="Book a Demo"
              >
                Book a Demo
              </button>
            </BookDemoModal>
            <VideoPlayer />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";

import { motion } from "framer-motion";

import { BookDemoModal } from "@/components/RateupHomePage/helpers/BookDemoModal";
import { Button } from "@/components/ui/button";
import { imagesPath } from "@/utils/constants";

export default function SuggestionBox() {
  return (
    <section className="flex flex-col items-center justify-center px-4 py-16 bg-white gap-10">
      <div className="flex flex-col items-center justify-center text-center bg-white gap-8">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-900 mb-4">
            The Suggestion Box,
          </h1>
          <div className="relative inline-block font-bold">
            <motion.svg
              width="100%"
              height="28"
              viewBox="0 0 200 28"
              preserveAspectRatio="none"
              className="absolute -bottom-1 left-0 z-0"
            >
              <motion.path
                d="M0,14 C50,28 150,0 200,14"
                stroke="#93c5fd"
                strokeWidth="16"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
            </motion.svg>

            <h1 className="relative z-10 text-[#004F98] text-3xl sm:text-4xl md:text-5xl font-semibold">
              Reimagined.
            </h1>
          </div>
        </div>

        <p className="text-gray-600 max-w-[50%]">
          Replace your dusty old complaint box with a smart QR code. Get
          real-time feedback, understand your customers on a deeper level, and
          turn their opinions into your biggest asset.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href={"https://rateup.app/signup"}>
            <Button
              size="lg"
              className="bg-[#C4D7F5] cursor-pointer hover:bg-[#bdd2f3] text-[#004F98] font-medium px-4"
            >
              Start For Free
            </Button>
          </Link>
          <BookDemoModal>
            <Button
              size="lg"
              className="bg-[#004F98] hover:bg-[#004f98ee] text-white group px-6 w-full sm:w-auto cursor-pointer"
            >
              Book a Demo
            </Button>
          </BookDemoModal>
        </div>
      </div>
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
        className="relative w-full max-w-6xl aspect-video rounded-xl bg-white"
      >
        <Image
          src={`${imagesPath}/qrNew/header2.png`}
          alt="image"
          fill
          className="object-contain rounded-xl"
        />
      </motion.div>

      <motion.div
        initial={{ x: -100, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
        className="relative w-full max-w-6xl aspect-video rounded-xl bg-white"
      >
        <Image
          src={`${imagesPath}/qrNew/INTRO.png`}
          alt="image"
          fill
          className="object-contain rounded-xl"
        />
      </motion.div>
    </section>
  );
}

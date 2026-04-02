"use client";

import Image from "next/image";

import { motion } from "motion/react";

import { qrHowItWorks } from "../QrConstants";

export default function QrHowItWorks() {
  return (
    <>
      {qrHowItWorks.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="w-full max-w-7xl px-6 sm:px-10 lg:px-12 mx-auto py-10 space-y-6 text-base sm:text-lg md:text-xl leading-relaxed"
        >
          <h3 className="text-[#003B7A] text-3xl font-semibold pb-3">
            {item.title}
          </h3>
          <p className="max-w-5xl font-semibold">{item.description}</p>

          {/* Centered Image */}
          <div className="flex mt-14 justify-center">
            <Image
              src={item.image}
              alt="Image"
              width={900}
              height={675}
              className="rounded-2xl w-[95%] shadow-xl" // Keep the image rounded and full width
            />
          </div>
        </motion.div>
      ))}
    </>
  );
}

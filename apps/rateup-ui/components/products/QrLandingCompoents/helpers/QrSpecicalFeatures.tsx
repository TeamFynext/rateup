"use client";

import Image from "next/image";

import { motion } from "motion/react";

import { qrSpecicalFeatures } from "../QrConstants";

export default function QrSpecicalFeatures() {
  return (
    <>
      {qrSpecicalFeatures.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="w-full max-w-7xl px-6 sm:px-10 lg:px-12 mx-auto sm:py-12 mt-10 
          space-y-1 text-base sm:text-lg md:text-xl leading-relaxed"
        >
          {/* Alternating Layout */}
          <div
            className={`flex flex-col lg:flex-row ${
              index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
            } items-center gap-16`}
          >
            {/* Text Section */}
            <div className="lg:w-1/2 text-center lg:text-left space-y-6">
              <h3 className="text-[#003B7A] text-4xl font-bold tracking-tight">
                {item.title}
              </h3>
              <p className="text-lg sm:text-xl pt-3 font-semibold text-gray-600 max-w-4xl mx-auto">
                {item.description}
              </p>
            </div>

            {/* Image Section */}
            <div className="lg:w-1/2">
              <div className="flex justify-center">
                <Image
                  src={item.image}
                  alt={item.title}
                  width={1200}
                  height={675}
                  className="rounded-2xl shadow-xl w-full transform transition-transform duration-300 hover:scale-105"
                />
              </div>
            </div>
          </div>

          {/* Add a subtle separator or light background */}
          <div className="border-t border-gray-200 mt-12 pt-8"></div>
        </motion.div>
      ))}
    </>
  );
}

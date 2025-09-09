"use client";

import Image from "next/image";

import { motion } from "framer-motion";

import { HomePagefeatures } from "./Constants";

export default function HomepageFeatures() {
  return (
    <section className="sm:py-16 py-6 bg-[#FFFFFF]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-14 space-y-24 sm:space-y-32">
        {HomePagefeatures.map((feature, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              feature.reverse ? "md:flex-row-reverse" : "md:flex-row"
            } items-center  gap-12`}
          >
            {/* TEXT COLUMN */}
            <div className="w-full md:w-1/2">
              <h2 className="text-2xl md:text-4xl font-semibold text-[#343A40]">
                {feature.title}{" "}
                <span
                  className="text-transparent bg-clip-text bg-gradient-to-l 
                from-[#004F98] to-[#001C57]"
                >
                  {feature.highlight}
                </span>
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                {feature.description}
              </p>
            </div>

            <div className="w-full md:w-1/2 flex justify-center relative">
              {/* Accent Shape */}
              <div className="absolute -top-6 -left-6 w-[85%] h-[85%] bg-gradient-to-tr from-blue-200 via-sky-100 to-transparent rounded-[3rem] blur-2xl z-[-1]" />

              {/* Motion Card */}
              <motion.div
                whileHover={{ scale: 1.05, rotate: 1 }}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                viewport={{ once: true }}
                className="relative rounded-xl  bg-white/70 backdrop-blur-xl border border-white/30 overflow-hidden max-w-md w-full"
              >
                <Image
                  src={feature.imageUrl}
                  alt={feature.imageAlt}
                  width={400}
                  height={300}
                  className="w-full h-auto object-cover"
                />
              </motion.div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

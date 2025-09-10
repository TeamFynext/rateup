"use client";

import Image from "next/image";

import { motion } from "framer-motion";

import { imagesPath } from "@/utils/constants";

export default function IntegrationHero() {
  return (
    <section className="bg-[#f4f7f3] sm:pt-12 pt-8 px-6 md:px-8 text-center">
      <motion.div
        className="max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Tagline */}
        <div className="inline-block bg-white text-[#1c518e] font-semibold text-sm px-5 py-2 rounded-full shadow-md mb-6">
          Seamless Tool Integration
        </div>

        {/* Main Heading */}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1f2937ed] leading-tight mb-6">
          Build Your Business With favorite{" "}
          <span className="relative inline-block">
            <span className="absolute inset-x-0 bottom-1 h-3 bg-[#bcd3f4] z-0 rounded-sm" />
            <span className="relative z-10 text-[#1c518e]"> Integrations</span>
          </span>
        </h2>

        {/* Subtext */}
        <p className="text-gray-600 text-sm md:text-lg lg:text-xl mb-10">
          Our software seamlessly integrates with internal CRM
          systems,streamlining data management, optimizing internal data use,and
          increasing productivity and profitability through a more efficient
          workflow.
        </p>

        {/*Image */}

        <div className="relative z-10 flex items-center  justify-center px-4 sm:px-2">
          <Image
            src={`${imagesPath}/INTEGRATION.png`}
            alt="Marketing Hero"
            width={1200} // reduced width for a smaller visual size
            height={600}
            quality={100}
            className="w-full max-w-[50rem] rounded-xl sm:rounded-3xl h-auto object-contain"
            priority
          />
        </div>
      </motion.div>
    </section>
  );
}

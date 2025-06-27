"use client";

import Image from "next/image";

import { motion } from "framer-motion";

import { imagesPath } from "@/utils/constants";

const features = [
  {
    number: 1,
    title: "Fragmented Customer Data?",
    image: `${imagesPath}/FRAGMENTED CUSTOMER DATA.png`,
  },
  {
    number: 2,
    title: "Complex Loyalty Programs?",
    image: `${imagesPath}/COMPLEX LOYALTY PROGRAM.png`,
  },
  {
    number: 3,
    title: "Ineffective AI & Automation?",
    image: `${imagesPath}/INEFFECTIVE AI & AUTOMATION.png`,
  },
];

export default function ObstaclesOverview() {
  return (
    <section className="bg-white py-10 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-center mb-7 sm:mb-10 "
        >
          <h2 className="text-[28px] sm:text-[36px] md:text-[43px]  text-center ">
            <span className="text-[#1c518e] ">Are These Your Challenges?</span>
          </h2>
        </motion.div>

        {/* Flow Layout */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.2,
              },
            },
          }}
        >
          {features.map((step, index) => (
            <motion.div
              key={index}
              variants={{
                hidden: { opacity: 0, y: 40, scale: 0.95 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 70,
                    damping: 15,
                  },
                },
              }}
              className="relative flex flex-col items-center text-center bg-white border border-gray-200 rounded-2xl p-4 shadow-md"
            >
              {/* Image */}
              <div className="rounded-xl overflow-hidden w-full max-h-[200px] sm:max-h-[240px]">
                <Image
                  src={step.image}
                  alt={`feature-${index}`}
                  width={500}
                  height={300}
                  className="object-contain w-full h-full"
                />
              </div>

              {/* Title */}
              <h3 className="text-[18px] sm:text-[22px] font-semibold text-[#00397b] mt-4 leading-snug">
                {step.title}
              </h3>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

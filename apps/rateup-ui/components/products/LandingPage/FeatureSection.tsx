"use client";

import Image from "next/image";

import { motion } from "motion/react";

import { imagesPath } from "@/utils/constants";

const features = [
  {
    number: 1,
    title: "Fragmented Customer Data?",
    image: `${imagesPath}/FRAGMENTED CUSTOMER DATA.png`,
    bgColor: "bg-blue-100",
    textColor: "text-blue-900",
  },
  {
    number: 2,
    title: "Complex Loyalty Programs?",
    image: `${imagesPath}/COMPLEX LOYALTY PROGRAM.png`,
    bgColor: "bg-sky-100",
    textColor: "text-sky-900",
  },
  {
    number: 3,
    title: "Ineffective AI & Automation?",
    image: `${imagesPath}/INEFFECTIVE AI & AUTOMATION.png`,
    bgColor: "bg-green-100",
    textColor: "text-green-900",
  },
];

export default function FeatureSection() {
  return (
    <section className="bg-white py-4 px-4 sm:px-14">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-[36px] sm:text-[40px] font-semibold text-[#1b1b1b] leading-tight">
            Are These Your Challenges?
          </h2>
        </motion.div>

        {/* Flow Layout */}
        <motion.div
          className="relative flex flex-col md:flex-row items-center md:items-center gap-10 md:gap-8 justify-center"
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
              className="relative flex flex-col items-center text-center group w-[320px] md:w-[340px]"
            >
              {/* Image */}
              <div className="bg-white rounded-2xl p-3 sm:p-4 w-full">
                <Image
                  src={step.image}
                  alt={`feature-${index}`}
                  width={500}
                  height={260}
                  className="rounded-lg object-contain w-full max-h-[200px] sm:max-h-[270px]"
                />
              </div>

              {/* Connector Line */}
              {index < features.length - 1 && (
                <div className="hidden md:flex absolute top-1/3 right-[-90px] translate-y-[-50%] w-[100px] h-[4px] z-10 items-center">
                  <div className="flex-1 border-t-[4px] border-dotted border-[#225fa4]"></div>
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[12px] border-l-[#225fa4] ml-2"></div>
                </div>
              )}

              {/* Title */}
              <h3 className="text-[20px] sm:text-[28px] font-semibold text-[#00397b] mt-4">
                {step.title}
              </h3>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

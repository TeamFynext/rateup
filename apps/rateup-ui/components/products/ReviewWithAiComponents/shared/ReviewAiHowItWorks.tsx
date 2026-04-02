"use client";

import { easeOut, motion } from "motion/react";

import { cardData } from "../constants";

const container = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: easeOut,
    },
  },
};

const ReviewAiHowItWorks = () => {
  return (
    <section id="use-cases" className="py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Heading */}
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 tracking-tight">
            How RateUp Works
          </h2>
          <div className="w-16 h-1 bg-[#009987] mx-auto mt-4 rounded-full" />
          <p className="mt-5 text-lg text-gray-600 leading-relaxed">
            Get More Reviews in 3 Simple Steps
          </p>
        </div>

        {/* Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {cardData.map((card, index) => (
            <motion.div
              key={index}
              variants={item}
              className="relative bg-white p-8 rounded-3xl shadow-xl 
              hover:shadow-2xl transition duration-300 border-t-[6px]"
              style={{ borderTopColor: card.borderColor }}
            >
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100">
                  {card.icon}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 text-center mb-2">
                {card.label}
              </h3>
              <p className="text-sm text-gray-600 text-center">
                {card.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
      </div>
    </section>
  );
};

export default ReviewAiHowItWorks;

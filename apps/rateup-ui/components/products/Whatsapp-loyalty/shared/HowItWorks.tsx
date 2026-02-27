"use client";

import { easeOut, motion } from "framer-motion";

import { steps2 } from "../constants";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: easeOut,
    },
  },
};

const HowItWorks = () => {
  return (
    <section
      id="how-it-works"
      className="py-20 bg-linear-to-r from-[#ebf4ee] to-[#ecfaf4]"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Heading */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={cardVariants}
          className="text-center flex flex-col items-center justify-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl text-[#009987] font-bold ">
            How It Works
          </h2>
          <p className="text-gray-600 max-w-xl pt-4 mx-auto">
            A simple, hassle-free loyalty program that your customers will
            actually use
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {steps2.map((step, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className="bg-white p-6 rounded-2xl shadow-md border hover:shadow-lg transition-all duration-300 text-center flex flex-col items-center"
            >
              <div className="rounded-full bg-green-100 p-4 mb-4">
                {step.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-gray-600 text-sm">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;

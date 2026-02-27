"use client";

import { easeOut, motion } from "framer-motion";

import { features2 } from "../constants";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
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

const FeaturesWhatsApp = () => {
  return (
    <section
      id="features"
      className="py-20 bg-linear-to-r from-[#ebf4ee] to-[#ecfaf4]"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Heading */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={cardVariants}
          className="text-center mb-16 flex flex-col items-center justify-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[#009987]">
            Why Businesses Choose RateUp
          </h2>
          <p className="text-gray-600 max-w-xl pt-3 mx-auto">
            Build customer loyalty that drives repeat visits and increases
            revenue
          </p>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {features2.map((feature, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className="relative group bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 text-center hover:-translate-y-1"
            >
              {/* Card content */}
              <div className="relative z-10">
                <div className="mb-6 inline-flex items-center justify-center w-14 h-14 bg-[#e6faf0] text-[#009987] rounded-full shadow-sm group-hover:scale-105 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2  text-gray-800">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesWhatsApp;

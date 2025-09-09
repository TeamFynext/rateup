"use client";

import { easeOut, motion } from "framer-motion";

import { benefits, features } from "../constants";

const container = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.25,
    },
  },
};

const item = {
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

const LaunchAnalyzeScale = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          variants={item}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <h2 className="text-3xl md:text-4xl text-[#009987] font-bold mb-4 tracking-tight">
            Launch, Analyze, & Scale with RateUp
          </h2>
          <p className="text-lg text-gray-600  mx-auto">
            Everything you need to build a successful loyalty program that
            drives growth
          </p>
        </motion.div>

        {/* Main Features */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={item}
              className={`border ${feature.color} hover:shadow-lg transition-all duration-300 hover:-translate-y-1 rounded-xl`}
            >
              <div className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`w-14 h-14 ${feature.iconBg} rounded-full flex items-center justify-center mb-4`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-gray-700">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Benefits Section */}
        <motion.div
          className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-8 lg:p-12"
          variants={item}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                variants={item}
                className="flex flex-col md:flex-row gap-4 items-start md:items-center"
              >
                <div className={`${benefit.color} p-3 rounded-lg`}>
                  {benefit.icon}
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-1">
                    {benefit.title}
                  </h4>
                  <p className="text-sm text-gray-600">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default LaunchAnalyzeScale;

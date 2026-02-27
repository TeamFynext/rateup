"use client";

import { motion } from "framer-motion";

import { features } from "../TestimonialContants";

const TestimonialFeaturesGrid = () => {
  return (
    <section className="w-full bg-white py-20 mt-8 px-6" id="features">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-800 leading-snug">
            <span className="bg-linear-to-r from-[#01446b] to-[#0041a8] text-transparent bg-clip-text">
              Collect, manage and showcase
            </span>{" "}
            testimonials
            <br />
            to build trust and boost conversions
          </h2>
        </div>

        <div className="relative py-16 bg-gradient-to-br from-white to-[#f2f6fb]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 relative z-10">
              {features.map((step, index) => (
                <motion.div
                  key={index}
                  className="relative group p-6 bg-white/80 backdrop-blur-md 
           border border-[#0041a8] rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  {/* Floating Icon */}
                  <div
                    className="absolute -top-6 left-6 w-16 h-16
           flex items-center justify-center rounded-full bg-[#e6f0ff] text-[#0041a8] shadow-md"
                  >
                    {step.icon}
                  </div>

                  <div className="pt-8">
                    <h3 className="text-xl font-semibold text-[#013553] mb-2">
                      {step.title}
                    </h3>
                    <p className="text-base text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialFeaturesGrid;

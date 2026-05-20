"use client";

import { Star } from "lucide-react";
import { easeOut, motion } from "motion/react";

import { testimonials } from "../constants.tsx";

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

const Testimonials = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={cardVariants}
          className="text-center mb-16 flex flex-col items-center justify-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[#009987] ">
            Loved by Local Businesses
          </h2>
          <p className="text-gray-600 max-w-2xl pt-3 mx-auto">
            Join hundreds of businesses who have transformed their customer
            retention
          </p>
        </motion.div>

        {/* Testimonials */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className="bg-white p-6 rounded-2xl shadow-md border hover:shadow-lg transition-all duration-300"
            >
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 text-yellow-400 fill-yellow-400"
                  />
                ))}
              </div>
              <p className="text-gray-700 italic mb-6">"{testimonial.quote}"</p>
              <div>
                <p className="font-semibold text-base">{testimonial.author}</p>
                <p className="text-sm text-gray-500">{testimonial.position}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;

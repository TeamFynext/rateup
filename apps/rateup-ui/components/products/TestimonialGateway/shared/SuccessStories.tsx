"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

import { testimonials } from "../TestimonialContants";

const StarRating = ({ count }: { count: number }) => (
  <div
    className="flex items-center gap-1 mt-2"
    aria-label={`Rating: ${count} out of 5 stars`}
  >
    {[...Array(count)].map((_, i) => (
      <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
    ))}
  </div>
);

const SuccessStories = () => {
  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 flex flex-col items-center text-center">
        <div className="mb-6">
          <p className="text-sm font-semibold text-[#0041a8] uppercase tracking-wide">
            Testimonials
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white pt-2">
            Success stories
          </h2>
          <p className="pt-3 text-gray-600 dark:text-gray-300 max-w-2xl">
            See how businesses are leveraging our platform to collect and
            showcase authentic testimonials
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 md:grid-cols-3 gap-8 w-full">
          {testimonials.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300 overflow-hidden flex flex-col"
            >
              <div className="p-6 flex flex-col justify-between flex-grow text-left">
                <div>
                  <StarRating count={t.rating} />
                  <p className="text-gray-700 font-semibold dark:text-gray-200 pt-3 text-sm">
                    {t.text}
                  </p>
                </div>
                <div className="mt-4 flex items-center text-sm text-green-500 font-medium">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2" />
                  Verified
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SuccessStories;

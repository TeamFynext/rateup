"use client";

import { Star } from "lucide-react";
import { motion } from "motion/react";

export const testimonials = [
  {
    id: 1,
    rating: 5,
    text: "RateUp has been a game-changer. Our engagement rates on feedback requests went from 25% to over 85%. The insights are gold, and we're addressing issues before they become problems.",
    name: "Sarah Johnson",
    position: "Head of People",
    company: "Tech Innovators Inc.",
  },
  {
    id: 2,
    rating: 5,
    text: "Finally, a tool that our employees actually use. The WhatsApp approach is brilliant. It's simple, fast, and gives us a real-time pulse on our company culture across all our branches.",
    name: "Mike Chen",
    position: "CEO",
    company: "Creative Solutions",
  },
  {
    id: 3,
    rating: 5,
    text: "The issue ticketing system is what sets RateUp apart. We're not just collecting data; we're closing the loop. It has created so much more trust within our teams.",
    name: "Emily Rodriguez",
    position: "HR Director",
    company: "Global Logistics",
  },
];

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

const InboxReview = () => {
  return (
    <section className="py-12 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-14 flex flex-col items-center text-center">
        <div className="mb-6">
          <p className="text-sm font-semibold text-[#0041a8] uppercase tracking-wide">
            Testimonials
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-700 dark:text-white pt-2">
            Why HR Leaders Love RateUp
          </h2>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 md:grid-cols-3 gap-8 w-full">
          {testimonials.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-2xl transition-shadow duration-300 overflow-hidden flex flex-col"
            >
              <div className="p-6 flex flex-col justify-between grow text-left">
                <div>
                  <StarRating count={t.rating} />
                  <p className="text-gray-700 font-semibold dark:text-gray-200 pt-3 text-sm">
                    {t.text}
                  </p>
                </div>
                <div className="mt-6 text-sm text-gray-800 dark:text-gray-300 font-medium">
                  <p>{t.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t.position}, {t.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InboxReview;

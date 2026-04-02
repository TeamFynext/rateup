"use client";

import Image from "next/image";

import { motion } from "motion/react";

import { blogPosts } from "./Constants";

export default function NewsStoriesCenter() {
  return (
    <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <div className="mb-4">
          <span className="inline-block bg-[#e9f5ef] text-[#1c518e] text-sm font-semibold px-4 py-1 rounded-full">
            Latest News
          </span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-semibold text-[#22281E] mb-6">
          News and {/* Background highlight for "Stories" */}
          <span className="relative inline-block">
            <span className="absolute inset-x-0 bottom-1 h-3 bg-[#bcd3f4] z-0 rounded-sm" />
            <span className="relative z-10 text-[#1c518e]"> Stories</span>
          </span>{" "}
          center
        </h2>

        <p className="text-gray-600 max-w-xl mx-auto text-sm sm:text-lg">
          Explore insightful content that keeps you ahead of the curve to the
          pulse of what's happening.
        </p>
      </div>

      <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
        {blogPosts.map((post, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: index * 0.2,
              ease: "easeOut",
              type: "spring",
              stiffness: 60,
            }}
            viewport={{ once: true, amount: 0.3 }}
            whileHover={{ scale: 1.02 }}
            className="bg-[#f6faf6] rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col group"
          >
            <div className="relative h-52 w-full overflow-hidden">
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className="h-full w-full"
              >
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-300 ease-in-out"
                />
              </motion.div>
            </div>

            <div className="p-6 flex flex-col justify-between flex-1">
              <div>
                <h3 className="text-lg font-semibold text-[#22281E] mb-3 leading-snug">
                  {post.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-5">
                  {post.description}
                </p>
              </div>
              <a
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start bg-[#3f5ba9] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#1c518e] transition-colors"
              >
                Read more
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";

import { motion } from "motion/react";

export const blogPosts = [
  {
    title:
      "Building Interactive Apps Inside WhatsApp: The Power of WhatsApp Flows",
    description:
      "Discover how businesses can create interactive applications that run directly inside WhatsApp conversations using WhatsApp Flows.",
    imageUrl:
      "https://blog.rateup.app/content/images/size/w1000/2024/09/How-to-Handle-Customer-Feedback.jpg",
    link: "/blog/whatsapp-flows/",
  },
  {
    title: "Customer Feedback Loop: Importance, Steps, and Best Practices",
    description:
      "Explore why businesses need a customer feedback loop and the steps and best practices for its successful implementation.",
    imageUrl:
      "https://blog.rateup.app/content/images/size/w1000/2024/09/Analyze-Customer-Feedback-for-FREE.jpg",
    link: "/blog/customer-feedback-loop/",
  },
  {
    title:
      "Automate Customer Feedback Management: Business Case and ROI for SMBs",
    description:
      "Learn how SMB founders can achieve double-digit ROI by implementing an automated customer feedback management platform.",
    imageUrl:
      "https://blog.rateup.app/content/images/size/w1000/2024/09/Automate-Customer-Feedback-Management.jpg",
    link: "/blog/automate-customer-feedback-roi/",
  },
];

export default function NewsStoriesCenter() {
  return (
    <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col justify-center items-center text-center">
        <div className="mb-4">
          <span className="inline-block bg-[#e9f5ef] text-[#1c518e] text-sm font-semibold px-4 py-1 rounded-full">
            Latest News
          </span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-semibold text-[#22281E] pb-6">
          News and {/* Background highlight for "Stories" */}
          <span className="relative inline-block">
            <span className="absolute inset-x-0 bottom-1 h-3 bg-[#bcd3f4] z-0 rounded-sm" />
            <span className="relative z-10 text-[#1c518e]"> Stories</span>
          </span>{" "}
          center
        </h2>

        <p className="text-gray-600 max-w-xl text-center mx-auto text-sm sm:text-lg">
          Explore insightful content that keeps you ahead of the curve to the
          pulse of what&pos;s happening.
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
              <Link
                href={post.link}
                rel="noopener noreferrer"
                className="self-start bg-[#3f5ba9] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#1c518e] transition-colors"
                aria-label={`Read the full blog about ${post.title}`}
              >
                View full article
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

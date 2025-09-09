"use client";

import React, { useEffect, useRef, useState } from "react";

import { IconArrowDown } from "@tabler/icons-react";
import { motion, useInView } from "framer-motion";
import {
  ClockIcon,
  EyeOffIcon,
  ScrollTextIcon,
  TrendingDownIcon,
} from "lucide-react";

function QrWhyIsStillStuck() {
  const problems = [
    {
      icon: <TrendingDownIcon className="w-10 h-10" color="#343A40" />,
      title: "Low Participation",
      description: "Customers rarely bother to write feedback manually.",
    },
    {
      icon: <ClockIcon className="text-gray-700 w-10 h-10" />,
      title: "Time-Consuming",
      description:
        "It's hard to compile, read, and find patterns in handwritten notes.",
    },
    {
      icon: <EyeOffIcon className="text-gray-700 w-10 h-10" />,
      title: "No Visibility",
      description:
        "No way to track or escalate serious issues, especially when you're not there.",
    },
    {
      icon: <ScrollTextIcon className="text-gray-700 w-10 h-10" />,
      title: "Manual Work",
      description: "Paper registers are hard to maintain, store, and audit.",
    },
  ];

  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true });
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isInView) setHasAnimated(true);
  }, [isInView]);

  return (
    <section
      ref={sectionRef}
      className="flex flex-col items-center justify-center text-center px-4 sm:px-6 md:px-10 pb-10 bg-white gap-12"
    >
      {/* Heading */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">
          Why Is Your Feedback Register
        </h1>
        <div className="relative inline-block font-bold">
          <motion.svg
            width="100%"
            height="28"
            viewBox="0 0 200 28"
            preserveAspectRatio="none"
            className="absolute -bottom-1 left-0 z-0"
          >
            <motion.path
              d="M0,14 C50,28 150,0 200,14"
              stroke="#93c5fd"
              strokeWidth="16"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={hasAnimated ? { pathLength: 1 } : {}}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </motion.svg>

          <h1 className="relative z-10 text-[#004F98] text-3xl sm:text-4xl font-semibold">
            Still Stuck in the Past?
          </h1>
        </div>
      </div>

      {/* Problems Grid */}
      <motion.div
        className="border border-[#E2E5ED] rounded-2xl overflow-hidden bg-[#FAFAFA] w-full max-w-5xl"
        initial={{ opacity: 0, y: 40 }}
        animate={hasAnimated ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {problems.map((problem, index) => (
            <motion.div
              key={index}
              className="flex items-start gap-4 p-6 sm:p-8 cursor-pointer"
              whileHover={{
                scale: 1.03,
                boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.08)",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
            >
              <div className="bg-[#D9D9D9] w-16 h-16 rounded-md flex items-center justify-center shrink-0">
                {problem.icon}
              </div>
              <div className="flex flex-col text-left">
                <p className="text-base font-semibold text-gray-900 mb-1">
                  {problem.title}
                </p>
                <p className="text-sm text-gray-500">{problem.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Call to Action Section */}
      <motion.div
        className="flex flex-col-reverse sm:flex-row items-center justify-between w-full max-w-5xl gap-8 sm:gap-12 px-4 sm:px-0"
        initial={{ opacity: 0, y: 40 }}
        animate={hasAnimated ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      >
        <div className="flex flex-col justify-center items-start text-left">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
            It's time to move from passive collection
          </h1>
          <div className="relative inline-block font-bold">
            <motion.svg
              width="100%"
              height="28"
              viewBox="0 0 200 28"
              preserveAspectRatio="none"
              className="absolute -bottom-1 left-0 z-0"
            >
              <motion.path
                d="M0,14 C50,28 150,0 200,14"
                stroke="#93c5fd"
                strokeWidth="16"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={hasAnimated ? { pathLength: 1 } : {}}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
            </motion.svg>

            <h1 className="relative z-10 text-[#004F98] text-2xl sm:text-3xl md:text-4xl font-semibold">
              to active listening.
            </h1>
          </div>
        </div>

        <div className="bg-[#C4D7F5] p-3 sm:p-4 rounded-full flex items-center justify-center shrink-0">
          <IconArrowDown color="#004F98" size={50} strokeWidth={2.5} />
        </div>
      </motion.div>
    </section>
  );
}

export default QrWhyIsStillStuck;

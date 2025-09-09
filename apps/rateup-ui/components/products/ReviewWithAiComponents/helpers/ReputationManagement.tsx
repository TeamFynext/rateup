"use client";

import React from "react";
import Image from "next/image";

import { motion } from "framer-motion";
import { TicketCheck } from "lucide-react";

import { imagesPath } from "@/utils/constants";

import { features } from "../constants";

export const ReputationManagement = () => {
  return (
    <section
      id="reputation-management"
      className="overflow-hidden bg-gradient-to-br from-white to-[#f0f4fa] py-24"
    >
      <div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-16 items-center">
          {/* Text Section */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="lg:pr-12 max-w-7xl mx-auto px-6 sm:px-24"
          >
            <h3 className="text-4xl sm:text-5xl font-bold text-[#009987] font-montserrat leading-tight">
              Why Reputation <br />
              Management Matters
            </h3>
            <p className="pt-4 text-lg text-gray-700 leading-relaxed max-w-xl">
              Build trust, grow visibility, and respond faster with our{" "}
              <span className="font-semibold text-[#009987]">
                AI-powered reputation analysis
              </span>
              . Understand what your customers really think—across every
              platform.
            </p>

            {/* Features List */}
            <div className="mt-10 bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-[#d6e4f5]">
              <ul className="space-y-6">
                {features.map((item, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx, duration: 0.4 }}
                    viewport={{ once: true }}
                    className="flex items-start gap-4"
                  >
                    <TicketCheck color="#006156" />
                    <div>
                      <p className="font-semibold text-[#009987] text-lg">
                        {item.title}
                      </p>
                      <p className="text-gray-700">{item.desc}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Image Section */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative"
          >
            <Image
              src={`${imagesPath}/Understand+Your+Online+Reputation.png`}
              alt="Reputation Management Illustration"
              className="w-full h-auto "
              width={2432}
              height={1442}
              priority
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

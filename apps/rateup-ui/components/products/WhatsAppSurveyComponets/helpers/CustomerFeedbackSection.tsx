"use client";

import { motion } from "framer-motion";
import { Mail, MessageSquare, Phone } from "lucide-react";

export default function CustomerFeedbackSection() {
  return (
    <section className="w-full mt-10 px-6 py-24 bg-linear-to-br from-white to-gray-100 text-center">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto"
      >
        <h2 className="text-4xl sm:text-5xl font-semibold text-[#075E54] leading-tight">
          Are You Losing Customers Because You{" "}
          <br className="hidden sm:block" />
          Can&apos;t Hear Them?
        </h2>
        <p className="pt-6 text-lg sm:text-xl text-gray-600">
          Email surveys get lost in spam. SMS goes unread. Phone calls annoy.
          Relying on these outdated methods means you're missing critical
          feedback, operating with a blind spot, and potentially losing business
          due to a dismal{" "}
          <span className="font-semibold text-gray-800">2% response rate</span>.
        </p>

        <div className="mt-10 flex justify-center gap-8">
          <motion.div
            whileHover={{ scale: 1.15 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Mail className="w-10 h-10 text-[#009987]" />
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.15 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <MessageSquare className="w-10 h-10 text-[#009987]" />
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.15 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Phone className="w-10 h-10 text-[#009987]" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

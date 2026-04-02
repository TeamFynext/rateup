"use client";

import Link from "next/link";

import { motion } from "motion/react";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal";
import { Button } from "@/components/ui/button";

export const WhatsAppSurveyCta = () => {
  return (
    <section className="py-24 px-4 md:px-6 bg-linear-to-br from-[#e0f2ffca] via-[#e0f2ffa5] to-[#cce4ff9c]">
      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-100px" }}
          className="relative z-10 p-8 md:p-12 lg:p-16 rounded-3xl 
          bg-linear-to-br from-[#e0fff9ca] via-[#e0fff1a5] to-[#ccffef9c] text-center"
        >
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-4xl font-semibold text-[#009987] leading-tight">
              Ready to Hear What Your Customers Really Think?
            </h2>

            <p className="text-lg py-3 text-[#013553] leading-relaxed">
              Stop missing out on valuable feedback. Start turning customer
              insights into measurable growth with RateUp's WhatsApp Surveys.
              Book your free, personalized demo today!
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Link href={"https://rateup.app/login"}>
                <Button
                  size="lg"
                  className="bg-[#009987] w-full hover:bg-[#009987] text-white font-semibold px-6 py-3 text-base transition"
                >
                  Get Started
                </Button>
              </Link>
              <BookDemoModal>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[#009987] text-[#009987] hover:bg-[#1c518e]/10 font-semibold px-6 py-3 text-base transition"
                >
                  Schedule a Demo
                </Button>
              </BookDemoModal>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhatsAppSurveyCta;

"use client";

import Link from "next/link";

import { motion } from "framer-motion";

import { BookDemoModal } from "@/components/RateupHomePage/helpers/BookDemoModal";
import { Button } from "@/components/ui/button";

export const TestimonialCTASection = () => {
  return (
    <section className="py-24 max-w-6xl mx-auto px-4 md:px-6 overflow-hidden">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-100px" }}
          className="relative p-8 md:p-12 lg:p-16 rounded-2xl 10 bg-linear-to-br from-[#e0f2ffca] via-[#e0f2ffa5] to-[#cce4ff9c]  text-center "
        >
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold pb-6 text-[#00397b]">
              Start collecting powerful testimonials today
            </h2>
            <p className="text-lg md:text-xl pb-10 text-[#013553]">
              Join thousands of businesses that use Testimonique to build trust
              and drive conversions
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="https://rateup.app/login">
                <Button
                  size="lg"
                  className="bg-[#00397b]  cursor-pointer hover:bg-[#00397b] text-white font-semibold px-6 py-3 text-base transition"
                >
                  Get Started for Free
                </Button>
              </Link>
              <BookDemoModal>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[#1c518e] cursor-pointer text-[#1c518e] hover:bg-[#1c518e]/10 font-semibold px-6 py-3 text-base transition"
                >
                  Schedule a Demo
                </Button>
              </BookDemoModal>
            </div>
            <p className="pt-6 text-sm text-[#1c518e]">
              No credit card required. Free 14-day trial on all plans.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialCTASection;

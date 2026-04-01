"use client";

import Link from "next/link";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal";

interface Colors {
  color1?: string;
  color2?: string;
}

const PricingSection = ({ color1, color2 }: Colors) => {
  const sharedStyles =
    "bg-white border border-gray-200 rounded-2xl shadow-lg p-8 flex flex-col justify-between transition-all duration-500 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)]";

  return (
    <section className="relative bg-gray-100 py-12 px-6 md:px-12 text-gray-800">
      <div className="text-center mb-16">
        <h4
          style={{ color: color1 }}
          className="text-[#1c518e] text-sm uppercase font-medium tracking-wider"
        >
          Our Pricing Plans
        </h4>
        <h2
          style={{ color: color2 }}
          className="text-4xl md:text-5xl font-bold text-[#00397b] mt-3"
        >
          Choose What You Need
        </h2>
      </div>

      <motion.div
        className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto mt-12"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={sharedStyles}>
          <div>
            <h3
              style={{ color: color2 }}
              className="text-2xl font-semibold text-[#00397b] mb-2"
            >
              Starter
            </h3>
            <p
              style={{ color: color1 }}
              className="text-5xl font-bold text-[#1c518e]"
            >
              ₹0{" "}
              <span className="text-base font-medium text-gray-500">
                /month
              </span>
            </p>
            <p className="text-gray-600 mt-3 mb-5 text-sm">
              Great for small teams just getting started.
            </p>
            <ul className="space-y-3 text-gray-700 text-sm">
              {[
                "Single Team with One User",
                "5 Web Surveys with 1000 monthly responses",
                "WhatsApp: Single Flow, One Automation, One Campaign with 1000 monthly template messages",
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-2">
                  <CheckCircle2 className="text-green-500 w-5 h-5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="https://rateup.app/login"
            style={{ "--c1": color1 || "#1c518e" } as React.CSSProperties}
            className="mt-6 text-center font-semibold py-2 rounded-md border transition
             bg-white text-[var(--c1)] border-[var(--c1)]
             hover:bg-[var(--c1)] hover:text-white"
          >
            Subscribe Now
          </Link>
        </div>

        <div className={sharedStyles}>
          <div>
            <h3
              style={{ color: color2 }}
              className="text-2xl font-semibold text-[#00397b] mb-2"
            >
              Enterprise
            </h3>
            <p
              style={{ color: color1 }}
              className="text-5xl font-bold text-[#1c518e]"
            >
              Custom
            </p>
            <p className="text-gray-600 mt-3 mb-6 text-sm">
              Customized Plan & Pricing
            </p>
            <div className="text-xl text-center text-gray-700 mt-6 mb-4">
              Let&apos;s Talk!
            </div>
          </div>
          <BookDemoModal>
            <button
              style={{
                backgroundColor: color1 ? color1 : "#1c518e",
              }}
              className="mt-6 w-full text-white font-semibold py-2 rounded-md 
              transition hover:opacity-90 cursor-pointer"
            >
              Contact Sales
            </button>
          </BookDemoModal>
        </div>
      </motion.div>
    </section>
  );
};

export default PricingSection;

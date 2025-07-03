import { useState } from "react";
import Link from "next/link";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

import { BookDemoModal } from "@/components/RateupHomePage/helpers/BookDemoModal";

const tabs = [
  { key: "web", label: "Web Survey" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "custom", label: "Custom" },
];

const PricingSection = () => {
  const [activeTab, setActiveTab] = useState("web");
  const sharedStyles =
    "bg-white border border-gray-200 rounded-2xl shadow-lg p-8 flex flex-col justify-between transition-all hover:shadow-2xl hover:scale-[1.03] duration-300";

  return (
    <section className="relative bg-gray-100 py-12 px-6 md:px-12 text-gray-800">
      <div className="text-center mb-16">
        <h4 className="text-[#1c518e] text-sm uppercase font-medium tracking-wider">
          Our Pricing Plans
        </h4>
        <h2 className="text-4xl md:text-5xl font-bold text-[#00397b] mt-3">
          Choose What You Need
        </h2>
      </div>

      <div className="flex justify-center mb-14">
        <div className="bg-gray-100 p-1 rounded-full flex gap-3 shadow-inner border border-gray-300">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`cursor-pointer ${
                activeTab === tab.key
                  ? "bg-[#1c518e] text-white"
                  : "text-[#1c518e] hover:bg-[#3f5ba9]/10"
              } text-sm font-medium px-6 py-2 rounded-full transition duration-300`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {(activeTab === "web" || activeTab === "whatsapp") && (
          <motion.div
            key={activeTab}
            className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto mt-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4 }}
          >
            <div className={sharedStyles}>
              <div>
                <h3 className="text-2xl font-semibold text-[#00397b] mb-2">
                  Starter
                </h3>
                <p className="text-5xl font-bold text-[#1c518e]">
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
                    "2 Surveys",
                    "100 Responses/Month",
                    "100 WhatsApp Messages/Month",
                    "1 Team",
                    "1 User",
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle2 className="text-green-500 w-4 h-4" /> {item}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={"/login"}
                className="mt-6 text-center bg-white text-[#1c518e] font-semibold py-2 rounded-md border border-[#1c518e] hover:bg-[#1c518e] hover:text-white transition"
              >
                Subscribe Now
              </Link>
            </div>

            <div className={sharedStyles}>
              <div>
                <h3 className="text-2xl font-semibold text-[#00397b] mb-2">
                  Enterprise
                </h3>
                <p className="text-5xl font-bold text-[#1c518e]">Custom</p>
                <p className="text-gray-600 mt-3 mb-6 text-sm">
                  Customized Plan & Pricing
                </p>
                <div className="text-xl text-center text-gray-700 mt-6 mb-4">
                  Let&apos;s Talk!
                </div>
              </div>
              <BookDemoModal>
                <button className="mt-6 bg-[#1c518e] text-white font-semibold py-2 rounded-md hover:bg-[#00397b] transition">
                  Contact Sales
                </button>
              </BookDemoModal>
            </div>
          </motion.div>
        )}

        {activeTab === "custom" && (
          <motion.div
            key={activeTab}
            className="max-w-xl mx-auto mt-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4 }}
          >
            <div className={sharedStyles}>
              <div>
                <h3 className="text-2xl font-semibold text-[#00397b] mb-2">
                  Custom Plan
                </h3>
                <p className="text-4xl font-extrabold text-[#1c518e]">Custom</p>
                <p className="text-gray-600 mt-3 mb-6 text-sm">
                  Built to fit your exact use case and scale.
                </p>
                <div className="text-xl text-center text-gray-700 mt-6 mb-4">
                  Let&apos;s Talk!
                </div>
              </div>
              <BookDemoModal>
                <button className="mt-6 bg-[#1c518e] text-white font-semibold py-2 rounded-md hover:bg-[#00397b] transition">
                  Contact Sales
                </button>
              </BookDemoModal>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default PricingSection;

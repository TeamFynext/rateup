"use client";

import { motion } from "motion/react";

const ComparisonSection = () => {
  return (
    <div className="w-full bg-white py-1 md:pt-12 text-gray-800">
      {/* Blue Header Bar */}
      <div className="w-full flex justify-start">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-[#003B7A] rounded-r-full w-full mr-14 px-6 sm:px-20 py-6 md:py-10 flex flex-row
           justify-center gap-4 sm:gap-x-12"
        >
          <h2 className="text-white text-xl sm:text-4xl md:text-5xl font-bold leading-tight">
            Why Your Packaging <br className="sm:hidden" />
            Needs QR Code
          </h2>

          <div className="bg-linear-to-br from-yellow-400 to-orange-500 w-10 sm:w-14 h-10 sm:h-14 rounded-full flex items-center justify-center font-bold text-white text-lg sm:text-3xl shadow-lg">
            ?
          </div>
        </motion.div>
      </div>

      {/* Text Content */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        viewport={{ once: true }}
        className="w-full max-w-7xl px-6 flex flex-col justify-center
         items-center sm:px-10 lg:px-12 mx-auto py-10 space-y-6 text-base font-semibold sm:text-lg 
         md:text-xl leading-relaxed"
      >
        <p>
          In the competitive world of packaging, standing out and connecting
          with consumers is crucial. QR Codes are changing the way brands
          connect with consumers. By providing instant access to product info,
          promotions, and more, they help build trust and boost brand image.
        </p>

        <p>
          Industry leaders like{" "}
          <span className="text-[#0057B7] font-semibold">Coca-Cola</span>,{" "}
          <span className="text-[#0057B7] font-semibold">PepsiCo</span>, and{" "}
          <span className="text-[#0057B7] font-semibold">Amazon</span> have seen
          great success with QR codes, increasing sales, ROI, and achieving
          KPIs.
        </p>

        <p>
          With the rise of smartphones and seamless QR code integration, smart
          packaging{" "}
          <span className="text-[#0057B7] font-extrabold text-2xl sm:text-3xl">
            isn’t just a trend — it’s the future.
          </span>
        </p>
      </motion.div>
    </div>
  );
};

export default ComparisonSection;

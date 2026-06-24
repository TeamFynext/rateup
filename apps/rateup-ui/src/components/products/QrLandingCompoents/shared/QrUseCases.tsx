import { motion } from "motion/react";

import QrSpecicalFeatures from "../helpers/QrSpecicalFeatures.tsx";

const QrUseCases = () => {
  return (
    <div className="w-full bg-white py-20 md:pt-12 text-gray-800" id="features">
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
            Special Features for the <br className="sm:hidden" />
            Packaging Industry
          </h2>
        </motion.div>
      </div>

      {/* Text Content */}
      <QrSpecicalFeatures />
    </div>
  );
};

export default QrUseCases;

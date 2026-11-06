import { Image } from "@unpic/react";
import { motion } from "motion/react";

import { imagesPath } from "@/utils/constants.ts";

import QrHowItWorks from "../helpers/QrHowItWorks.tsx";

const QrFeaturesGrid = () => {
  return (
    <div className="w-full bg-white py-1 md:pt-12 text-gray-800" id="platform">
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

          <div className="bg-white w-10 sm:w-14 p-2 h-10 sm:h-14 rounded-full flex items-center justify-center font-bold text-white text-lg sm:text-3xl shadow-lg">
            <Image src={`${imagesPath}/rateup-star.svg`} alt="logo" width={80} height={80} />
          </div>
        </motion.div>
      </div>

      {/* Text Content */}
      <QrHowItWorks />
    </div>
  );
};

export default QrFeaturesGrid;

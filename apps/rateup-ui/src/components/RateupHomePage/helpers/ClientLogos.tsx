"use client";

import { Image } from "@unpic/react";
import { motion } from "motion/react";

import { imagesPath } from "@/utils/constants.ts";

const logo1 = `${imagesPath}/homepage/CLIENTS/1.png`;
const logo2 = `${imagesPath}/homepage/CLIENTS/2.png`;
const logo3 = `${imagesPath}/homepage/CLIENTS/3.png`;
const logo4 = `${imagesPath}/homepage/CLIENTS/4.png`;
const logo5 = `${imagesPath}/homepage/CLIENTS/5.png`;
const logo6 = `${imagesPath}/homepage/CLIENTS/6.png`;
const logo7 = `${imagesPath}/homepage/CLIENTS/7.png`;
const logo8 = `${imagesPath}/homepage/CLIENTS/8.png`;
const logo9 = `${imagesPath}/homepage/CLIENTS/9.png`;
const logo10 = `${imagesPath}/homepage/CLIENTS/10.png`;
const logo11 = `${imagesPath}/homepage/CLIENTS/11.png`;
const logo12 = `${imagesPath}/homepage/CLIENTS/12.png`;
const logo13 = `${imagesPath}/homepage/CLIENTS/13.png`;
const logo14 = `${imagesPath}/homepage/CLIENTS/14.png`;

const logos = [
  logo1,
  logo2,
  logo3,
  logo4,
  logo5,
  logo6,
  logo7,
  logo8,
  logo9,
  logo10,
  logo11,
  logo12,
  logo13,
  logo14,
];

const ClientLogos = () => {
  const allLogos = [...logos, ...logos]; // duplicate for seamless loop

  return (
    <section
      className={`bg-white flex items-center justify-center py-6 sm:py-8 lg:pb-7`}
    >
      <div className="border border-light-blue-5 w-[95vw] sm:w-[90vw] lg:w-[80vw] flex flex-col sm:flex-row items-stretch justify-between rounded-lg overflow-hidden">
        {/* Left Section */}
        <div className="flex flex-col items-center justify-center px-4 sm:px-6 w-full sm:w-[200px] lg:w-[13vw] bg-grey-color-5 text-center">
          <span className="text-rateup-lightgraytext text-sm sm:text-base font-semibold">
            Trusted By
          </span>
          <span className="bg-linear-to-r from-rateup-blue to-rateup-darkblue bg-clip-text text-transparent font-bold text-base sm:text-lg lg:text-xl">
            100+ Clients
          </span>
        </div>

        {/* Scrolling Logos */}
        <div className="relative overflow-hidden w-full border-t sm:border-t-0 sm:border-l border-light-blue-5 py-4 flex items-center">
          <motion.div
            className="flex gap-8 sm:gap-12 min-w-max"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {[...allLogos, ...allLogos].map((logo, index) => (
              <Image
                key={index}
                src={logo}
                width={100}
                height={100}
                alt={`Client Logo ${index + 1}`}
                className="h-[40px] sm:h-[50px] lg:h-[70px] w-auto object-contain filter grayscale brightness-0"
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ClientLogos;

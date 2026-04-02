"use client";

import Image from "next/image";

import { motion } from "motion/react";

import { imagesPath } from "@/utils/constants";

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
    <section className=" py-4 overflow-hidden  ">
      <div className="relative overflow-hidden">
        <motion.div
          className="flex gap-12 min-w-max"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {allLogos.map((logo, index) => (
            <Image
              key={index}
              src={logo}
              width={100}
              height={100}
              alt={`Client Logo ${index + 1}`}
              className="sm:h-[110px] h-[60px] w-auto object-contain"
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ClientLogos;

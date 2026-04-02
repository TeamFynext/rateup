"use client";

import Image from "next/image";

import { motion } from "motion/react";

import { imagesPath } from "@/utils/constants";

export default function DecorativeHeroImages() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="pointer-events-none absolute bottom-0 left-28 hidden xl:block"
      >
        <Image
          src={`${imagesPath}/homepage/image (3).png`}
          alt="person1"
          width={228}
          height={520}
          priority
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="pointer-events-none absolute bottom-2 left-24 hidden xl:block"
      >
        <Image
          src={`${imagesPath}/homepage/image (4).png`}
          alt="person4"
          width={68}
          height={130}
          priority
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.8 }}
        className="pointer-events-none absolute right-16 bottom-0 hidden xl:block"
      >
        <Image
          src={`${imagesPath}/homepage/image (2).png`}
          alt="person2"
          width={116}
          height={482}
          priority
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="pointer-events-none absolute right-56 bottom-0 hidden xl:block"
      >
        <Image
          src={`${imagesPath}/homepage/image (5).png`}
          alt="person4"
          width={212}
          height={166}
          quality={100}
          priority
        />
      </motion.div>
    </>
  );
}

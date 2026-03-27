"use client";

import Image from "next/image";
import Link from "next/link";

import { motion } from "framer-motion";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal";
import { Button } from "@/components/ui/button";
import { imagesPath } from "@/utils/constants";

const Hero = () => {
  return (
    <section
      className="w-full bg-[#CCEBE7]
       min-h-[80vh] flex items-center"
    >
      <div className="w-full grid grid-cols-1 md:grid-cols-2 items-center gap-x-1">
        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="space-y-6 text-center sm:my-0 my-6 
           flex flex-col justify-center md:text-left px-8 md:px-16"
        >
          <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold text-gray-800 leading-tight tracking-tight mb-6">
            Build Loyalty That Actually Works{" "}
            <span className="text-[#009987]">— On WhatsApp.</span>
          </h1>

          <p className="text-lg text-gray-600 max-w-xl sm:py-0 py-4 ">
            Turn every purchase into a reason to come back. Reward your
            customers instantly — no apps, no cards, no confusion.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-4 mb-6">
            <Link href={"https://rateup.app/login"}>
              <Button
                size="lg"
                className="text-base w-full px-8 bg-[#009987] hover:bg-[#009987]
               text-white rounded-sm"
              >
                Start Free
              </Button>
            </Link>
            <BookDemoModal>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 cursor-pointer border-gray-300 text-gray-800 rounded-sm"
              >
                Book a Demo
              </Button>
            </BookDemoModal>
          </div>
          <div className="text-sm text-gray-500 flex items-center">
            <span className="mr-2">⭐</span>
            Trusted by 500+ local businesses across World
          </div>
        </motion.div>

        {/* Right Image */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex justify-end pr-0"
        >
          <Image
            src={`${imagesPath}/whatsapp-loyalty/HEADER IMAGE (1).jpg`}
            width={500}
            height={500}
            alt="Dashboard showing testimonial management system"
            className="w-full sm:mt-0 mt-4 rounded-bl-3xl"
            priority
          />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;

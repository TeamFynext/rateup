"use client";

import { Image } from "@unpic/react";
import { motion } from "motion/react";

import { clientIcons } from "../TicketingConstants.tsx";

// Duplicating icons for seamless scroll
const scrollingIcons = [...clientIcons, ...clientIcons];

const Client = ({ icon }: { icon: string }) => (
  <div className="flex items-center justify-center h-28 w-40 rounded-xl border border-gray-200 bg-white shadow-sm mx-4 p-4">
    <Image
      src={icon}
      alt="Client logo"
      width={160}
      height={80}
      className="object-contain mx-9"
    />
  </div>
);

const ClientsSection = () => {
  return (
    <section
      className="py-20 px-6 lg:px-8 bg-gray-50 overflow-hidden"
      id="clients"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">
            Trusted by 500+ businesses
          </h2>
          <div className="w-16 h-1 bg-[#0041a8] mt-4 mx-auto rounded-full" />
        </div>

        <div className="relative w-full overflow-hidden">
          <motion.div
            className="flex whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              repeat: Infinity,
              repeatType: "loop",
              duration: 20,
              ease: "linear",
            }}
          >
            {scrollingIcons.map((icon, index) => (
              <Client key={index} icon={icon} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ClientsSection;

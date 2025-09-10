"use client";

import Image from "next/image";

import { motion } from "framer-motion";

import { clientIcons } from "../../TicketLandingComponets/TicketingConstants";

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

const ClientsSectionSurvey = () => {
  return (
    <section className="py-20 px-6 lg:px-8overflow-hidden" id="clients">
      <div className="max-w-7xl mx-auto">
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

export default ClientsSectionSurvey;

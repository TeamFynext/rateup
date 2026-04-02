"use client";

import { easeOut, motion } from "motion/react";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { cardData } from "../constants";

const container = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: easeOut,
    },
  },
};

const DidYouKnow = () => {
  return (
    <section className="py-28 bg-linear-to-br from-[#f1fdf6] to-[#e3f6ec]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Heading */}
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-[#009987] tracking-tight">
            Did you know?
          </h2>
          <div className="w-16 h-1 bg-[#25D366] mx-auto mt-4 rounded-full" />
          <p className="mt-5 text-lg text-gray-600 leading-relaxed">
            These powerful facts reveal why retention should be your business
            superpower.
          </p>
        </div>

        {/* Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {cardData.map((card, index) => (
            <motion.div
              key={index}
              variants={item}
              className="relative bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition duration-300 border-t-[6px]"
              style={{ borderTopColor: card.borderColor }}
            >
              <div className="flex items-center mb-6">
                <div
                  className={`rounded-full w-14 h-14 flex items-center justify-center ${card.iconBg}`}
                >
                  {card.icon}
                </div>
                <Separator className="w-full ml-4" />
              </div>
              <div
                className="text-5xl font-bold text-center mb-4"
                style={{ color: card.borderColor }}
              >
                {card.value}
              </div>
              <h3 className="text-xl font-semibold text-gray-800 text-center mb-2">
                {card.label}
              </h3>
              <p className="text-sm text-gray-600 text-center">
                {card.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          variants={item}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="mt-20 text-center px-8 py-20 rounded-[2rem] bg-linear-to-br from-[#ffffff] to-[#f2fdf7] border border-[#d6f3e4] shadow-2xl"
        >
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl md:text-3xl font-semibold text-gray-800 leading-snug">
              With <span className="text-[#128C7E] font-bold">RateUp</span>,
              customer loyalty is no longer a buzzword. It's your{" "}
              <span className="text-[#20b958] font-semibold">
                growth engine
              </span>{" "}
              — fueled by WhatsApp.
            </h2>
            <BookDemoModal>
              <Button className="mt-8 cursor-pointer bg-[#009987] hover:bg-[#1fbe59] text-white text-lg px-8 py-9 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg inline-flex items-center gap-2">
                Boost Your Retention Now
              </Button>
            </BookDemoModal>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DidYouKnow;

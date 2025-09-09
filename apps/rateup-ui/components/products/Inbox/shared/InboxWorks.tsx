"use client";

import { easeOut, motion } from "framer-motion";
import { BarChart4, MessageSquareText, Settings2 } from "lucide-react";

const cardData = [
  {
    icon: <MessageSquareText className="w-7 h-7 text-white" />,
    label: "Launch via WhatsApp",
    description:
      "Send automated, friendly check-ins to employees on the app they already use and trust. No downloads needed.",
    iconBg: "from-[#1c518e] to-[#3b82f6]",
  },
  {
    icon: <BarChart4 className="w-7 h-7 text-white" />,
    label: "Gather Rich Insights",
    description:
      "Collect real-time quantitative scores (eNPS) and qualitative feedback through natural conversation.",
    iconBg: "from-[#1c518e] to-[#10b981]",
  },
  {
    icon: <Settings2 className="w-7 h-7 text-white" />,
    label: "Analyze & Resolve",
    description:
      "Visualize data on your dashboard, identify key issues with AI, and create trackable tickets for resolution.",
    iconBg: "from-[#1c518e] to-[#f59e0b]",
  },
];

const container = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.25,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: easeOut,
    },
  },
};

const InboxWorks = () => {
  return (
    <section className="py-28 bg-gradient-to-b from-[#e0f2ff] via-[#f1f5f9] to-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Heading */}
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-[#1c518e] leading-tight">
            From Conversation to Resolution in Minutes
          </h2>
          <div className="w-16 h-1 bg-[#1c518e] mx-auto mt-4 rounded-full" />
          <p className="mt-6 text-lg text-gray-600 font-medium">
            Our streamlined process makes employee engagement effortless and
            effective.
          </p>
        </div>

        {/* Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {cardData.map((card, index) => (
            <motion.div
              key={index}
              variants={item}
              className="group bg-white p-8 rounded-3xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="mb-6 flex justify-center">
                <div
                  className={`w-14 h-14 rounded-full bg-gradient-to-br ${card.iconBg} flex items-center justify-center shadow-lg`}
                >
                  {card.icon}
                </div>
              </div>
              <h3 className="text-xl font-semibold text-center text-gray-900 mb-3">
                {card.label}
              </h3>
              <p className="text-center text-gray-600 text-sm leading-relaxed">
                {card.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default InboxWorks;

"use client";

import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart, MessageSquare, RefreshCcw } from "lucide-react";
import { easeOut, motion } from "motion/react";

import { Button } from "@/components/ui/button.tsx";

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOut },
  },
};

const ShopifyIntegration = () => {
  return (
    <section id="integrations" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Heading */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={cardVariants}
          className="text-center flex justify-center flex-col items-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="font-bold text-[#009987]">
              Works Seamlessly with Shopify and More
            </span>
          </h2>
          <p className="text-gray-600 max-w-2xl pt-4 mx-auto">
            Connect RateUp with your existing tools in seconds. Our Shopify
            plugin lets you automatically track purchases, reward customers, and
            sync data without lifting a finger.
          </p>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <RefreshCcw className="h-8 w-8 text-[#009987] mb-4" />,
              title: "Auto-Sync Purchases",
              desc: "Orders automatically trigger points & rewards.",
            },
            {
              icon: <MessageSquare className="h-8 w-8 text-[#009987] mb-4" />,
              title: "WhatsApp Engagement",
              desc: "Send post-purchase messages, coupons, and reminders instantly.",
            },
            {
              icon: <BarChart className="h-8 w-8 text-[#009987] mb-4" />,
              title: "Real-Time Insights",
              desc: "Get customer-level loyalty data right inside your dashboard.",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="bg-white p-6 rounded-xl shadow-sm border"
            >
              {feature.icon}
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600 mb-6">
            <strong>Also integrates with:</strong> WooCommerce, POS systems,
            CRMs, and custom APIs.
          </p>
          <Link to={"https://rateup.app/login"}>
            <Button
              size="lg"
              className="px-8 bg-[#009987] mt-4 hover:bg-[#3c716b] transition-all"
            >
              Connect Your Store
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default ShopifyIntegration;

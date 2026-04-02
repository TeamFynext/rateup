"use client";

import Link from "next/link";

import { Check } from "lucide-react";
import { motion } from "motion/react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

import { tiers } from "../TestimonialContants";

interface PricingTierProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
  delay?: number;
}

const PricingTier: React.FC<PricingTierProps> = ({
  name,
  price,
  description,
  features,
  popular = false,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      viewport={{ once: true, margin: "-100px" }}
      className="h-full"
    >
      <Card
        className={`h-full border ${
          popular
            ? "border-[#1c518e] bg-white dark:bg-black/80 shadow-xl relative overflow-hidden"
            : "bg-white/60 dark:bg-black/60 backdrop-blur-sm"
        }`}
      >
        {popular && (
          <div className="absolute top-0 right-0">
            <div className="bg-[#1c518e] text-white text-xs font-medium py-1 px-3 rounded-bl-lg">
              Most Popular
            </div>
          </div>
        )}
        <CardHeader className="pt-8 pb-4">
          <h3 className="text-xl font-bold text-[#013553]">{name}</h3>
          <div className="mt-4 flex items-baseline">
            <span className="text-4xl font-bold text-[#1c518e]">{price}</span>
            {price !== "Free" && (
              <span className="ml-1 text-gray-500">/month</span>
            )}
          </div>
          <p className="mt-2 text-gray-500">{description}</p>
        </CardHeader>
        <CardContent className="pb-6">
          <ul className="space-y-3">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start">
                <div className="mr-3 mt-1 shrink-0 text-[#1c518e]">
                  <Check size={16} />
                </div>
                <span className="text-sm text-[#013553]">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="pt-4 pb-8">
          <Link
            href="https://rateup.app/login"
            className={`w-full py-2.5 text-center rounded-3xl border transition-transform ${
              popular
                ? "bg-[#1c518e] text-white hover:bg-[#00397b]"
                : "border-[#1c518e] text-[#1c518e] hover:bg-[#1c518e] hover:text-white"
            }`}
          >
            {"Start Free Trial"}
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export const TestimonialPricingSection = () => {
  return (
    <section id="pricing" className="py-24 bg-white dark:bg-black">
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="mb-16 flex flex-col items-center text-center">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="inline-block text-sm tracking-wider uppercase text-[#1c518e] font-semibold  bg-[#1c518e1a] px-3 rounded-full"
          >
            Pricing
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold py-3  text-[#013553]"
          >
            Simple, transparent pricing
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-gray-600 max-w-3xl  mx-auto"
          >
            Choose the plan that works best for your business
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier, index) => (
            <PricingTier
              key={index}
              name={tier.name}
              price={tier.price}
              description={tier.description}
              features={tier.features}
              popular={tier.popular}
              delay={index}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-gray-500">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialPricingSection;

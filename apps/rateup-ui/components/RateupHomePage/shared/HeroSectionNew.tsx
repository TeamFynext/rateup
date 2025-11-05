import { IconCheck } from "@tabler/icons-react";
import { motion } from "framer-motion";

import { Separator } from "@/components/ui/separator";

export default function HeroSection() {
  return (
    <section className="flex flex-col items-center justify-center gap-8 bg-rateup-darkblue py-16">
      {/* Heading */}
      <div className="flex flex-col items-center justify-center gap-2">
        <span className="text-[#E2E5ED] font-semibold text-5xl text-center">
          Reimagine Customer Engagement -
        </span>

        {/* Gradient text + underline container */}
        <div className="relative inline-block">
          <span className="text-5xl bg-[linear-gradient(to_right,#66D7FF,#2D74E0)] bg-clip-text text-transparent font-semibold">
            Unified. Automated. Intelligent.
          </span>

          {/* Animated underline */}
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute -bottom-2 left-0 right-0 h-[6px] bg-[#C4D7F5] rounded-full origin-left"
          />
        </div>
      </div>

      {/* Subtext */}
      <div className="flex flex-col items-center justify-center text-center">
        <span className="text-[#93C6F5] font-medium text-sm">
          Unify all customer chats in one intelligent platform. RateUp
          automates, analyzes, and connects
        </span>
        <span className="text-[#93C6F5] font-medium text-sm">
          — helping you engage smarter across every channel.
        </span>
      </div>

      {/* CTA Buttons + Highlights */}
      <div className="flex flex-col justify-center items-center gap-4">
        {/* Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button className="bg-rateup-blue text-white font-semibold px-4 py-2 rounded-sm hover:scale-105 transition-transform duration-200">
            Start Free Trial
          </button>
          <button className="bg-rateup-gold text-white font-semibold px-4 py-2 rounded-sm hover:scale-105 transition-transform duration-200">
            Book A Demo
          </button>
        </div>

        <Separator />

        {/* Checkpoints */}
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex items-center justify-center gap-10">
            <div className="flex items-center justify-center gap-1">
              <div className="flex items-center justify-center p-1 bg-[#69F0AE] rounded-full">
                <IconCheck className="h-3 w-3" />
              </div>
              <span className="text-[#E2E5ED] text-sm">No Credit Card</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <div className="flex items-center justify-center p-1 bg-[#69F0AE] rounded-full">
                <IconCheck className="h-3 w-3" />
              </div>
              <span className="text-[#E2E5ED] text-sm">No Expiry</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ArrowButton } from "../components/btn";

export function Integrations() {
  return (
    <section className="py-24 relative overflow-hidden" id="solutions">
      {/* Background glow for integrations */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[20rem] w-[40rem] rounded-[100%] bg-rateup-blue/10 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-sm p-12 text-center relative overflow-hidden">
          {/* Integrations Image */}
          <div className="w-full flex justify-center mb-16 relative z-10">
            <img
              src="/images/integrations.svg"
              alt="RateUp Integrations"
              className="w-full max-w-5xl h-auto object-contain rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(46,91,255,0.15)]"
            />
          </div>

          <div className="relative z-10 space-y-6 mt-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              Connect Rateup To Your Favourite Tools
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto pb-4">
              Integrate with Shopify, WooCommerce, Zendesk, and 100+ other
              platforms to bring all your customer data into one unified
              workspace.
            </p>
            <ArrowButton label="View All Integrations" />
          </div>
        </div>
      </div>
    </section>
  );
}

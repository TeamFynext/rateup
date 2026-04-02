import { imagesPath } from "@/utils/constants";
import { sora } from "@/utils/fonts";

import { ArrowButton } from "../components/btn";

export function Integrations() {
  return (
    <section className="relative overflow-hidden" id="solutions">
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[20rem] w-[40rem] rounded-[100%] bg-rateup-blue/10 blur-[100px]" />
      </div>

      <div className="xl:max-w-6xl xl:mx-auto xl:w-[calc(100%-4rem)] px-8 xl:px-0 py-2">
        <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-sm text-center relative overflow-hidden">
          <div className="w-full relative z-10">
            <img
              src={`${imagesPath}/landing/integrations.svg`}
              alt="RateUp Integrations"
              className="w-full h-auto object-cover rounded-t-3xl"
              width="1200"
              height="800"
            />
          </div>
          <div className="relative z-10 space-y-2 py-4 px-4 sm:px-8 text-center">
            <h2
              className={`text-2xl sm:text-3xl md:text-5xl text-white tracking-tight ${sora.className}`}
            >
              Connect Rateup To Your Favourite Tools
            </h2>
            <p
              className={`text-rateup-light-blue-2 text-base sm:text-lg pb-4 max-w-xl mx-auto text-center`}
            >
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

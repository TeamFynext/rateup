import { Sora } from "next/font/google";

import { IconArrowRight } from "@tabler/icons-react";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function LoyaltyAd() {
  return (
    <section
      className={`${sora.className} flex items-center justify-center w-full py-10 sm:py-16 bg-white`}
    >
      <div className="flex flex-col lg:flex-row items-center justify-between w-full max-w-6xl border rounded-3xl sm:rounded-4xl p-6 sm:p-10 shadow-sm">
        {/* Left Content */}
        <div className="flex flex-col gap-4 max-w-lg">
          <span className="text-4xl sm:text-5xl font-semibold text-rateup-graytext leading-tight">
            Loyalty That Drives <br className="hidden sm:block" /> Engagement
            And Growth
          </span>
          <p className="text-rateup-graytext text-sm leading-relaxed max-w-md font-medium">
            Turn every interaction into a lasting relationship. Build a loyalty
            program that keeps customers engaged, rewards them instantly, and
            fuels long-term business growth.
          </p>

          <button className="inline-flex items-center justify-center bg-rateup-gold hover:bg-orange-600 text-white font-semibold px-3 py-1 rounded-sm w-fit transition-all gap-2">
            <span className="text-sm font-semibold">Try For Free</span>
            <IconArrowRight className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Right Image Placeholder */}
        <div className="mt-10 lg:mt-0 flex justify-center w-full lg:w-1/2">
          {/* Replace this with your actual image later */}
          <div className="w-full max-w-md h-80 bg-gray-100 rounded-2xl border border-gray-200 flex items-center justify-center text-gray-400 text-sm">
            Image Placeholder
          </div>
        </div>
      </div>
    </section>
  );
}

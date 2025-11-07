import { Sora } from "next/font/google";
import Image from "next/image";

import { IconArrowRight } from "@tabler/icons-react";

import { imagePath } from "@/components/HomePage/pages/constants";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function LoyaltyAd() {
  return (
    <section
      className={`${sora.className} flex items-center justify-center w-full py-10 sm:py-16 bg-white`}
    >
      <div className="flex flex-col lg:flex-row items-start justify-between w-full max-w-6xl border rounded-3xl sm:rounded-4xl pl-6 sm:pl-10 shadow-sm">
        {/* Left Content */}
        <div className="flex flex-col gap-4 max-w-lg pt-6">
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
        <div className="rounded-r-3xl sm:rounded-r-4xl">
          <Image
            src={`${imagePath}/homepage/loyaltyad.png`}
            alt="loyalty"
            width={600}
            height={600}
            className="w-full h-auto object-contain rounded-r-3xl sm:rounded-r-4xl"
            priority
          />
        </div>
      </div>
    </section>
  );
}

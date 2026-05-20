"use client";

import { useState } from "react";

import { Image } from "@unpic/react";

import { Button } from "@/components/ui/button.tsx";
import { imagesPath } from "@/utils/constants.ts";

import { featureImages, QrHerofeatures } from "../QrConstants.tsx";

/** — helpers — */
const pill =
  "relative inline-flex items-center gap-2 pr-5 pl-3 py-2 text-xs font-medium " +
  "rounded-full bg-white backdrop-blur transition " +
  "shadow-[0_0_0_2px_rgba(255,255,255,0.45)_inset,0_0_0_4px_rgba(0,75,160,0.55)_inset] " +
  "hover:shadow-[0_0_0_2px_rgba(255,255,255,0.6)_inset,0_0_0_4px_rgba(0,110,255,0.65)_inset]";

export default function QrHeroSection() {
  const [hoveredImage, setHoveredImage] = useState(
    `${imagesPath}/qr-landing/1FEEDBACK COLLECTION.png`,
  );

  return (
    <section
      className="w-full bg-white  min-h-[100vh] flex sm:pt-0 pt-20
 bg-gradient-to-l from-[#004F98] to-[#001C57]"
    >
      <div className="w-full grid grid-cols-1 xl:grid-cols-2  items-center gap-x-1">
        {/* Left Content */}
        <div className="space-y-2 text-center flex flex-col justify-center md:text-left px-4 md:px-16">
          <h1 className="text-3xl sm:text-3xl lg:text-5xl font-bold text-gray-50 leading-tight tracking-tight">
            We Transform Your Marketing & Packaging with Smart QR Codes
          </h1>
          <p className="text-gray-100 text-lg max-w-xl mx-auto md:mx-0 py-3">
            Transform your marketing and packaging with RateUp's next-level QR
            code engagement platform. Capture leads, drive sales, collect
            feedback, and gain invaluable insights – all from a single scan.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <Button
              className="bg-[#0041a8] cursor-pointer text-white px-6 py-3 text-base hover:bg-[#003a94] shadow-md"
              aria-label="Book a demo"
            >
              Book a Demo
            </Button>
            <Button
              variant="outline"
              className="text-[#0041a8] cursor-pointer border-[#0041a8] hover:bg-[#f0f4ff] px-6 py-3 text-base"
              aria-label="Start for free"
            >
              Start for free
            </Button>
          </div>

          <div className="flex flex-wrap justify-center cursor-pointer md:justify-start gap-4 pt-6">
            {QrHerofeatures.map(({ label, icon: Icon, bg, color }) => (
              <span
                key={label}
                className={pill}
                onMouseEnter={() =>
                  setHoveredImage(
                    featureImages[label as keyof typeof featureImages],
                  )
                }
                onMouseLeave={() =>
                  setHoveredImage(
                    `${imagesPath}/qr-landing/1FEEDBACK COLLECTION.png`,
                  )
                }
              >
                <span
                  className={`${bg} flex h-6 w-6 shrink-0  items-center justify-center rounded-full`}
                >
                  <Icon className={`h-4 w-4 ${color}`} />
                </span>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Right Image */}
        <div className="relative flex xl:mt-0 mt-12 pr-0 w-full max-w-screen">
          {/* Background image behind the phone */}
          <Image
            src={`${imagesPath}/qr-landing/0 BG STYLE.png`}
            height={700}
            width={500}
            alt="Decorative background"
            className="absolute top-0 left-0 w-full h-full z-0 object-contain"
            priority
          />

          {/* Foreground image - phone with feedback screen */}
          <Image
            src={hoveredImage}
            height={700}
            width={500}
            alt="Phone screen with feedback form"
            className="relative z-10 w-full h-full object-contain"
            priority
          />
        </div>
      </div>
    </section>
  );
}

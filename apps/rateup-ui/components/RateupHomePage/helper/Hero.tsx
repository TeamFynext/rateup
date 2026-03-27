import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { imagesPath } from "@/utils/constants";
import { sora } from "@/utils/fonts";

import { ArrowButton } from "../components/btn";
import { SocialBadge } from "../components/socialBadge";

const socialBadges = [
  { src: `${imagesPath}/landing/logos/ico-whatsapp.png`, label: "WhatsApp" },
  { src: `${imagesPath}/landing/logos/ico-messenger.png`, label: "Messenger" },
  { src: `${imagesPath}/landing/logos/ico-instagram.png`, label: "Instagram" },
  { src: `${imagesPath}/landing/logos/ico-shopify.png`, label: "Shopify" },
  { src: `${imagesPath}/landing/logos/ico-webchat.png`, label: "Web Chat" },
  {
    src: `${imagesPath}/landing/logos/ico-woocommerce.png`,
    label: "WooCommerce",
  },
];
const gradientText: React.CSSProperties = {
  background: "linear-gradient(to right, #1873e8, #60a5fa)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  display: "inline-block",
};

export default function Hero() {
  const router = useRouter();
  return (
    <section className="xl:max-w-6xl xl:mx-auto xl:w-[calc(100%-4rem)] px-8 xl:px-0 pt-16 sm:pt-20 pb-16 sm:pb-20 flex  items-center flex-col md:flex-row">
      {/* Left content */}
      <div className="w-full xl:flex-1 xl:basis-80">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 justify-between bg-blue-500/10 border border-blue-500/30 rounded-full px-3.5 py-1.5 mb-5">
          {/* <span className="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block shrink-0" /> */}
          <span className="text-xs text-blue-300">
            POST-PURCHASE CUSTOMER PLATFORM
          </span>
        </div>

        {/* Heading */}
        <h1
          className={`text-3xl sm:text-4xl xl:text-5xl font-semibold leading-tight ${sora.className}`}
        >
          <span className="text-light-blue-5">What Happens After A</span>
          <br />
          <span style={gradientText}>Customer Buys?</span>
        </h1>

        {/* Body */}
        <p
          className={`text-sm text-slate-400 leading-relaxed mb-6 max-w-md pb-3 ${sora.className}`}
        >
          Most businesses focus on acquiring customers — but the real money is
          in what happens after the sale. RateUp automates feedback collection,
          builds loyalty, and turns buyers into repeat customers automatically.
        </p>
        <div className="h5 ">Works With</div>
        {/* Feature grid */}
        <div className="flex flex-wrap gap-3 mb-6 my-4">
          {socialBadges.map((item) => (
            <SocialBadge key={item.label} src={item.src} label={item.label} />
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3 mb-6">
          <ArrowButton
            hoverText="hover:text-white"
            onClick={() => router.push("/signup")}
          />
          <ArrowButton
            label="Book A Demo"
            bg="bg-rateup-light-blue"
            hoverBg="hover:bg-rateup-darkblue-2"
            textColor="text-rateup-dark-blue-3"
            hoverText="hover:text-white"
            onClick={() => router.push("/bookdemo")}
          />
        </div>
        <div className="flex flex-wrap items-center gap-6 mt-4">
          {["No Credit Card Needed", "10-Minute Setup", "Cancel Anytime"].map(
            (text) => (
              <div key={text} className="flex items-center gap-2">
                {/* Icon */}
                <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="text-black"
                  >
                    <path
                      d="M6.5 11L3.5 8L2.5 9L6.5 13L14 5.5L13 4.5L6.5 11Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>

                {/* Text */}
                <span className="text-sm text-slate-300">{text}</span>
              </div>
            ),
          )}
        </div>
      </div>
      {/* Right image */}
      {/* Right image */}
      {/* Right image */}
      <div className="w-full md:w-1/2 flex items-center justify-end">
        <Image
          src={`${imagesPath}/landing/cover.svg`}
          alt="cover"
          width={400}
          height={400}
          className="w-full max-w-[400px] h-auto"
        />
      </div>
    </section>
  );
}

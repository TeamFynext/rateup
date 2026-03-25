// import { Check } from "lucide-react";
import React from "react";

import { geist, sora } from "@/utils/fonts";

import { ArrowButton } from "../components/btn";
import { SocialBadge } from "../components/socialBadge";

const socialBadges = [
  { src: "/images/landing/logos/ico-whatsapp.png", label: "WhatsApp" },
  { src: "/images/landing/logos/ico-messenger.png", label: "Messenger" },
  { src: "/images/landing/logos/ico-instagram.png", label: "Instagram" },
  { src: "/images/landing/logos/ico-shopify.png", label: "Shopify" },
  { src: "/images/landing/logos/ico-webchat.png", label: "Web Chat" },
  { src: "/images/landing/logos/ico-woocommerce.png", label: "WooCommerce" },
];
const gradientText: React.CSSProperties = {
  background: "linear-gradient(to right, #1873e8, #60a5fa)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  display: "inline-block",
};

// usage
<span style={gradientText}>Customer Buys?</span>;
const C = {
  bg0: "#04091a",
  bg1: "#070f24",
  bg2: "#0b1530",
  bg3: "#0f1d3a",
  border: "rgba(255,255,255,0.07)",
  blue: "#1873E8",
  text1: "#ffffff",
  text2: "#94a3b8",
  text3: "#64748b",
  yellow: "#facc15",
};

export default function Hero() {
  return (
    <section className="max-w-7xl mx-8 xl:mx-29 px-6 pt-20 pb-20 flex gap-14 items-center flex-wrap">
      {/* Left content */}
      <div className="flex-1 basis-80  w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 justify-between bg-blue-500/10 border border-blue-500/30 rounded-full px-3.5 py-1.5 mb-5">
          {/* <span className="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block shrink-0" /> */}
          <span className="text-xs text-blue-300">
            POST-PURCHASE CUSTOMER PLATFORM
          </span>
        </div>

        {/* Heading */}
        <h1
          className={`text-5xl font-semibold leading-tight ${sora.className}`}
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
          <ArrowButton hoverText="hover:text-white" />
          <ArrowButton
            label="Book A Demo"
            bg="bg-rateup-light-blue"
            hoverBg="hover:bg-rateup-darkblue-2"
            textColor="text-rateup-dark-blue"
            hoverText="hover:text-white"
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
      <div className="flex-1 basis-72 max-w-lg w-full">
        <div className="aspect-[4/3] rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-slate-400">
          <img
            src="https://www.svgrepo.com/show/246211/landscape-night.svg"
            alt="placeholder"
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </section>
  );
}

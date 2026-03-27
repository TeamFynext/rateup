"use client";

import React from "react";
import Image from "next/image";

import { imagesPath } from "@/utils/constants";

import styles from "../components/landing.module.css";

const logos = [
  { name: "Elance", src: `${imagesPath}/landing/customerLogos/Elance.svg` },
  { name: "Entri", src: `${imagesPath}/landing/customerLogos/entri.svg` },
  { name: "FabUs", src: `${imagesPath}/landing/customerLogos/FabUs.svg` },
  {
    name: "Kerala SM",
    src: `${imagesPath}/landing/customerLogos/kerala sm.svg`,
  },
  { name: "MYG", src: `${imagesPath}/landing/customerLogos/MYG.svg` },
  { name: "ShopDoc", src: `${imagesPath}/landing/customerLogos/ShopDoc.svg` },
  {
    name: "Voye Homes",
    src: `${imagesPath}/landing/customerLogos/voye-homes.svg`,
  },
];

interface ClientsProps {
  speed?: number;
  className?: string;
}

export default function Clients({ speed = 30, className = "" }: ClientsProps) {
  const items = [...logos, ...logos];

  return (
    <div className="w-full px-8 xl:px-0 xl:max-w-6xl xl:mx-auto xl:w-[calc(100%-4rem)] flex items-center justify-center py-10">
      {" "}
      <div className="relative flex flex-col items-center justify-center w-full gap-4">
        {/* Meta Business Partner Badge */}
        {/* <MetaBusinessPartnerBadge /> */}
        <div className="group relative inline-flex cursor-default">
          {/* Glow effect (kept same) */}
          <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md bg-blue-500/40 scale-110" />

          <Image
            src={`${imagesPath}/landing/logos/metabp.svg`}
            alt="Meta Business Partner"
            width={280}
            height={80}
            className="relative w-[200px] sm:w-[240px] md:w-[280px] h-auto
               transition-transform duration-300 ease-out
               group-hover:scale-105 group-hover:drop-shadow-[0_0_16px_rgba(0,129,251,0.6)]"
          />
        </div>
        {/* Heading */}
        <p className="py-2 text-lg sm:text-xl md:text-2xl font-semibold leading-tight text-center text-white">
          <span>Trusted by </span>
          <span className={styles.gradientText}>100+ </span>
          <span>ecommerce brands across </span>
          <span className={styles.gradientText}>30+ </span>
          <span>Countries</span>
        </p>
        {/* Marquee */}
        <div
          className={[
            "w-full overflow-hidden rounded-[30px]",
            "bg-[#004F98]/[0.12]",
            "border border-[#004F98]/30",
            "py-6 sm:py-8",
            "mx-auto mt-2",
            "shadow-[0_0_40px_rgba(0,79,152,0.15)]",
            className,
          ].join(" ")}
        >
          <style>{`
            @keyframes marquee {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .marquee-track {
              display: flex;
              width: max-content;
              animation: marquee ${speed}s linear infinite;
            }
            .marquee-track:hover {
              animation-play-state: paused;
            }
          `}</style>

          <div className="marquee-track">
            {items.map((logo, i) => (
              <div
                key={i}
                className="flex items-center justify-center px-8 sm:px-12 shrink-0 opacity-90 hover:opacity-100 transition-opacity"
              >
                <Image
                  src={logo.src}
                  alt={logo.name}
                  width={100}
                  height={40}
                  className="h-8 sm:h-10 w-auto"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

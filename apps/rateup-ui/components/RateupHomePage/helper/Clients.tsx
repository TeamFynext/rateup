"use client";

import React from "react";
import Image from "next/image";

import styles from "../components/landing.module.css";
import { MetaBadge } from "../components/metaBadge";

const logos = [
  { name: "Elance", src: "/images/customerLogos/Elance.svg" },
  { name: "Entri", src: "/images/customerLogos/entri.svg" },
  { name: "FabUs", src: "/images/customerLogos/FabUs.svg" },
  { name: "Kerala SM", src: "/images/customerLogos/kerala sm.svg" },
  { name: "MYG", src: "/images/customerLogos/MYG.svg" },
  { name: "ShopDoc", src: "/images/customerLogos/ShopDoc.svg" },
  { name: "Voye Homes", src: "/images/customerLogos/voye-homes.svg" },
];

interface ClientsProps {
  speed?: number; // seconds for one full loop — lower = faster
  className?: string;
}

export default function Clients({ speed = 30, className = "" }: ClientsProps) {
  const items = [...logos, ...logos];
  return (
    <div className="max-w-7xl mx-8 xl:mx-29 flex items-center justify-center w-full py-10">
      <div className="relative flex flex-col items-center justify-center w-full  ">
        <MetaBadge />
        <p className={`py-2 text-2xl font-semibold leading-tight `}>
          <span>Trusted by </span>
          <span className={styles.gradientText}>100+ </span>
          <span>ecommerce brands across </span>
          <span className={styles.gradientText}>30+ </span>
          <span>Countries</span>
        </p>

        <div
          // clients marquee
          className={[
            "w-full overflow-hidden rounded-[30px]",
            "bg-[#004F98]/[0.12]",
            "border border-[#004F98]/30",
            "py-6 sm:py-8",
            "mx-auto mt-6",
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
                  className="h-10 w-auto"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

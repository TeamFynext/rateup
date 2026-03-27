"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { sr } from "date-fns/locale";
import { Layers } from "lucide-react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { imagesPath } from "@/utils/constants";

const slides = [
  {
    label: "Unified Omnichannel Inbox",
    src: `${imagesPath}/landing/feature-1.png`,
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 10h8M8 14h5" />
      </svg>
    ),
    title: "Unified\nOmnichannel Inbox",
    chips: ["4 Channels", "Multi-agent login", "Lead lifecycle", "Teams"],
    desc: "WhatsApp, Instagram, Facebook Messenger, and Web Chat all in one place. Multi-agent login, team routing, lead lifecycle tagging, and full customer context on every conversation.",
  },
  {
    label: "loyalty & Referrals",
    src: `${imagesPath}/landing/feature-2.png`,
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 17.5h7M17.5 14v7" />
      </svg>
    ),
    title: "Smart\nAutomation",
    chips: [
      "WhatsApp Native",
      "Referral Tracking",
      "Instant Cashback",
      "Milestone Rewards",
    ],
    desc: "Build a loyalty program that turns one-time buyers into your most vocal advocates. Instant cashback, milestone rewards, referral tracking — all running automatically on WhatsApp.",
  },
  {
    label: "TSmart Automation Builder",
    src: `${imagesPath}/landing/feature-3.png`,
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Team\nCollaboration",
    chips: ["No Code", "Drag & Drop", "WhatsApp Flow", "AI Automated Journeys"],
    desc: "Design complex WhatsApp and Instagram flows with a drag-and-drop builder. Triggers, conditions, actions — no code, no developer, no waiting.",
  },
  {
    label: "Customer Profiles & Retention AI",
    src: `${imagesPath}/landing/feature-4.png`,
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="5" r="2" />
        <circle cx="5" cy="19" r="2" />
        <circle cx="19" cy="19" r="2" />
        <path d="M12 7v4M12 11l-5.5 6M12 11l5.5 6" />
      </svg>
    ),
    title: "CRM\nIntegration",
    chips: [
      "WhatsApp Native",
      "Referral Tracking",
      "Instant Cashback",
      "Milestone Rewards",
    ],
    desc: "From the first purchase to every feedback response, support ticket, and loyalty redemption — RateUp automatically captures, connects, and tags it all into a single live profile.",
  },
];

export function FeatureShowcase() {
  const [current, setCurrent] = useState(0);
  const [api, setApi] = useState(null);
  const timerRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (!api) return;
    api.scrollTo(current);
  }, [api, current]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => api.off("select", onSelect);
  }, [api]);

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 2000);
  }, []);

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, [resetTimer]);

  const handleIndicatorClick = useCallback(
    (i) => {
      setCurrent(i);
      resetTimer();
    },
    [resetTimer],
  );

  return (
    <section className="py-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[30rem] w-[30rem] rounded-full bg-rateup-dark-blue-3 blur-[120px]" />
      </div>

      <div className="w-full px-8 xl:px-0 xl:max-w-6xl xl:mx-auto xl:w-[calc(100%-4rem)]">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center rounded-full border border-rateup-blue/30 bg-rateup-blue/10 px-3 py-1 text-sm font-medium text-rateup-blue w-fit mx-auto">
            <Layers className="h-4 w-4 mr-2" />
            Features
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            Everything In One Place, <br className="hidden md:block" />
            <span className="text-rateup-blue">Nothing Siloed.</span>
          </h2>
        </div>

        {/* Outer wrapper — gives space for the pill to overflow above */}
        <div className="relative pt-6">
          {/* ── Pill indicator: centered, straddles the top border of the card ── */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {slides.map((s, i) => {
              const isActive = i === current;
              return (
                <button
                  key={i}
                  onClick={() => handleIndicatorClick(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: isActive ? "8px" : "0px",
                    padding: isActive ? "8px 18px 8px 14px" : "9px",
                    borderRadius: "999px",
                    border: "none",
                    outline: "none",
                    cursor: "pointer",
                    background: isActive ? "#2563eb" : "transparent",
                    color: isActive ? "#ffffff" : "#2f5bbf",
                    transition:
                      "background 0.35s ease, padding 0.35s ease, gap 0.35s ease, color 0.3s ease",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {s.icon}
                  </span>
                  <span
                    style={{
                      display: "inline-block",
                      maxWidth: isActive ? "260px" : "0px",
                      opacity: isActive ? 1 : 0,
                      overflow: "hidden",
                      transition: "max-width 0.4s ease, opacity 0.25s ease",
                      fontSize: "13px",
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      lineHeight: 1,
                    }}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Card: overflow visible so pills can straddle the top edge ── */}
          <div
            className="rounded-[2.5rem] border border-white/10 bg-rateup-dark-blue-3 shadow-[0_0_80px_-20px_rgba(46,91,255,0.2)]"
            style={{ overflow: "visible" }}
          >
            {/* Inner clip wrapper so carousel slides don't spill out of rounded corners */}
            <div className="rounded-[2.5rem] overflow-hidden">
              <Carousel className="w-full" setApi={setApi}>
                <CarouselContent>
                  {slides.map((slide, index) => (
                    <CarouselItem key={index}>
                      {/* pt-10 so slide content clears the overlapping pill row */}
                      <div className="flex flex-col lg:flex-row items-center justify-between  gap-12 px-8 pb-10 pt-20 lg:px-12 relative min-h-[420px]">
                        {/* Glow */}
                        <div className="absolute top-0 right-0 -m-32 w-64 h-64 bg-rateup-blue/20 rounded-full blur-[80px] pointer-events-none" />

                        {/* Left image placeholder */}
                        <div>
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          <Image
                            src={slide.src}
                            alt={slide.label}
                            width={460}
                            height={460}
                          />
                        </div>
                        {/* Right content */}
                        <div className="w-full lg:w-1/2 flex flex-col gap-5 z-10">
                          <h3 className="text-4xl lg:text-5xl font-bold text-white leading-tight whitespace-pre-line">
                            {slide.title}
                          </h3>
                          <p className="text-base text-rateup-blue-2 leading-relaxed max-w-md">
                            {slide.desc}
                          </p>
                          {/* Chips */}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {slide.chips.map((chip, i) => (
                              <div
                                key={i}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium flex-shrink-0"
                                style={{
                                  backgroundColor: "#071a3e",
                                  border: "1px solid rgba(255,255,255,0.15)",
                                  color: "#22d3ee",
                                }}
                              >
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    backgroundColor: "#22d3ee",
                                    flexShrink: 0,
                                    display: "inline-block",
                                  }}
                                />
                                {chip}
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-col sm:flex-row gap-4 pt-2">
                            <button
                              className="px-5 text-[14px] py-2.5 rounded-xl border font-semibold border-rateup-blue-4 bg-rateup-blue-2 text-white transition"
                              onClick={() => router.push("/login")}
                            >
                              Get Started Now
                            </button>
                            <button className="bg-white/10 border border-white/20 px-5 py-2.5 rounded-xl text-white cursor-pointer hover:bg-white/15 transition">
                              <span className="font-semibold text-[14px]">
                                Know More
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

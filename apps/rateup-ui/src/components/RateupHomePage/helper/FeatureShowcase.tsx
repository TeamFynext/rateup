"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";

import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { Layers } from "lucide-react";

import { imagesPath } from "@/utils/constants.ts";

// ─── Slide data ────────────────────────────────────────────────────────────────
const slides = [
  {
    label: "Customer Acquisition",
    accent: "linear-gradient(135deg, #2563EB, #60A5FA)", // Blue (Inbox)
    bg: "#F2FFEA",
    src: `${imagesPath}/landing/feature-1.svg`,
    title: "Unified Omnichannel Inbox",
    desc: "WhatsApp, Instagram, Facebook Messenger, and Web Chat all in one place. Multi-agent login, team routing, lead lifecycletagging, and full customer context on every conversation.",
    chips: ["4 Channels", "Multi-agent login", "Lead lifecycle", "Teams"],
    href: "#",
  },
  {
    label: "Lead Qualification",
    accent: "linear-gradient(135deg, #7C3AED, #C084FC)", // Purple (Automation)
    bg: "#F5EEFF",
    src: `${imagesPath}/landing/feature-2.svg`,
    title: "Smart Automation",
    desc: "Build a loyalty program that turns one-time buyers into your most vocal advocates. Instant cashback, milestone rewards, referral tracking — all running automatically on WhatsApp.",
    chips: [
      "WhatsApp Native",
      "Referral Tracking",
      "Instant Cashback",
      "Milestone Rewards",
    ],
    href: "#",
  },
  {
    label: "Lead Nurturing",
    src: `${imagesPath}/landing/feature-3.svg`,
    accent: "linear-gradient(135deg, #06B6D4, #67E8F9)", // Cyan (CRM)    src: `${imagesPath}/landing/feature-3.svg`,
    title: "Team\nCollaboration",
    desc: "Design complex WhatsApp and Instagram flows with a drag-and-drop builder. Triggers, conditions, actions — no code, no developer, no waiting.",
    chips: ["No Code", "Drag & Drop", "WhatsApp Flow", "AI Automated Journeys"],

    href: "#",
  },
  {
    label: "Lead Conversion",
    accent: "#0891B2",

    bg: "#E1FCFF",
    src: `${imagesPath}/landing/feature-4.svg`,
    title: "CRM Integration",
    desc: "From the first purchase to every feedback response, support ticket, and loyalty redemption — RateUp automatically captures, connects, and tags it all into a single live profile.",
    chips: [
      "WhatsApp Native",
      "Referral Tracking",
      "Instant Cashback",
      "Milestone Rewards",
    ],
    href: "#",
  },
];

// ─── Stacking presets ──────────────────────────────────────────────────────────
const STACK_FWD = [
  { y: 0, scale: 1, opacity: 1, z: 4 },
  { y: 16, scale: 0.962, opacity: 0.55, z: 3 },
  { y: 32, scale: 0.924, opacity: 0.25, z: 2 },
  { y: 48, scale: 0.886, opacity: 0.08, z: 1 },
];

const STACK_BWD = [
  { y: 0, scale: 1, opacity: 1, z: 4 },
  { y: -16, scale: 0.962, opacity: 0.55, z: 3 },
  { y: -32, scale: 0.924, opacity: 0.25, z: 2 },
  { y: -48, scale: 0.886, opacity: 0.08, z: 1 },
];

function getCardStyle(
  cardIdx: number,
  active: number,
  goingDown: boolean,
  n: number,
): React.CSSProperties {
  const STACK = goingDown ? STACK_FWD : STACK_BWD;
  const rel = (cardIdx - active + n) % n;
  const p = STACK[rel] ?? {
    y: goingDown ? 48 : -48,
    scale: 0.886,
    opacity: 0,
    z: 0,
  };
  return {
    transform: `translateY(${p.y}px) scale(${p.scale})`,
    opacity: rel < STACK.length ? p.opacity : 0,
    zIndex: p.z,
    transition:
      "transform 0.65s cubic-bezier(0.4,0,0.2,1), opacity 0.65s cubic-bezier(0.4,0,0.2,1)",
  };
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function FeatureShowcase() {
  const [current, setCurrent] = useState(0);
  const [goingDown, setGoingDown] = useState(true);

  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ticking = useRef(false);
  const prevScroll = useRef(0);

  // Listen on window — the page scrolls, not a div
  const onScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;

    requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const down = scrollY >= prevScroll.current;
      prevScroll.current = scrollY;
      setGoingDown(down);

      // Active = last step whose top edge has crossed 50% of viewport height
      const midpoint = window.innerHeight * 0.5;
      let found = 0;
      stepRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < midpoint) found = i;
      });

      setCurrent(found);
      ticking.current = false;
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // initialise on mount
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const activeSlide = slides[current];

  return (
    <section className="w-full ">
      {/* Heading */}
      <div className="text-center mb-16 space-y-4">
        <div className="inline-flex items-center rounded-full border border-rateup-blue/30 bg-rateup-blue/10 px-3 py-1 text-sm font-medium text-white w-fit mx-auto">
          <Layers className="h-4 w-4 mr-2" />
          Features
        </div>
        <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
          Everything In One Place, <br className="hidden md:block" />
          <span className="text-rateup-blue">Nothing Siloed.</span>
        </h2>
      </div>

      {/* ══════════ MOBILE ══════════ */}
      <div className="lg:hidden max-w-7xl mx-auto px-5 py-10 flex flex-col gap-16">
        {slides.map((slide, i) => (
          <div key={i} className="flex flex-col gap-8">
            <div className="flex flex-col">
              <span
                className="text-blue-300 text-sm font-semibold uppercase tracking-widest mb-2"
                style={{ color: slide.accent }}
              >
                {slide.label}
              </span>
              <h3
                className="text-3xl font-semibold text-rateup-blue mb-4"
                // style={{ fontFamily: "Degular Display, Georgia, serif" }}
              >
                {slide.title}
              </h3>
              <p className="text-lg text-gray-300 leading-relaxed mb-5">
                {slide.desc}
              </p>
              <a
                href={slide.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-medium text-white w-fit"
                style={{ backgroundColor: "black" }}
              >
                Know more <ArrowIcon />
              </a>
            </div>
            <div
              className="w-full rounded-2xl overflow-hidden flex items-center justify-center p-6"
              style={{ backgroundColor: slide.bg, minHeight: 260 }}
            >
              <div className="relative w-full" style={{ aspectRatio: "16/10" }}>
                <Image
                  src={slide.src}
                  alt={slide.label}
                  layout="fullWidth"
                  aspectRatio={16 / 10}
                  objectFit="contain"
                  className="object-contain rounded-lg"
                  sizes="90vw"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════ DESKTOP ══════════ */}
      <div className="bg-rateup-dark-blue-3 rounded-[2rem] hidden lg:block w-full px-8 xl:px-0 xl:max-w-6xl xl:mx-auto xl:w-[calc(100%-4rem)] ">
        <div className="flex gap-20 p-8 rounded-t-[2rem]">
          {/* LEFT — normal page flow, each step is ~70vh tall */}
          <div className="flex-1 min-w-0">
            {slides.map((slide, i) => (
              <DesktopStep
                key={i}
                slide={slide}
                index={i}
                active={current === i}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
              />
            ))}
          </div>

          {/* RIGHT — sticky stacked image panel */}
          <div className="flex-shrink-0" style={{ width: 480 }}>
            <div
              className="sticky"
              style={{ top: "15vh", height: "70vh", width: 480 }}
            >
              {/* Tinted background wash */}
              <div
                className="absolute inset-0 rounded-3xl transition-colors duration-700"
                style={{ backgroundColor: activeSlide.bg, zIndex: 0 }}
              />

              {/* Stacked cards — all absolutely positioned on top of each other */}
              <div className="relative w-full h-full">
                {slides.map((slide, i) => (
                  <div
                    key={i}
                    className="absolute inset-4 rounded-2xl overflow-hidden shadow-xl"
                    style={{
                      willChange: "transform, opacity",
                      ...getCardStyle(i, current, goingDown, slides.length),
                    }}
                  >
                    <Image
                      src={slide.src}
                      alt={slide.label}
                      layout="fullWidth"
                      aspectRatio={4 / 3}
                      objectFit="cover"
                      className="object-cover"
                      sizes="480px"
                    />
                  </div>
                ))}
              </div>

              {/* Dot navigation */}
              {/* <div
                className="absolute flex flex-col gap-3"
                style={{ right: -28, top: "50%", transform: "translateY(-50%)", zIndex: 10 }}
              >
                {slides.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Go to slide ${i + 1}`}
                    onClick={() =>
                      stepRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" })
                    }
                    className="w-2 rounded-full transition-all duration-300"
                    style={{
                      height: current === i ? 24 : 8,
                      backgroundColor: current === i ? activeSlide.accent : "#D1D5DB",
                    }}
                  />
                ))}
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Desktop step ──────────────────────────────────────────────────────────────
type SlideData = (typeof slides)[number];

const DesktopStep = forwardRef<
  HTMLDivElement,
  { slide: SlideData; index: number; active: boolean }
>(function DesktopStep({ slide, index, active }, ref) {
  return (
    <div
      ref={ref}
      className="flex flex-col justify-center py-24 border-b border-gray-100 last:border-b-0"
      style={{
        minHeight: "70vh",
        opacity: active ? 1 : 0.3,
        transition: "opacity 0.4s ease",
      }}
    >
      <p
        className="text-xs font-bold tracking-[.18em] uppercase mb-3"
        style={{ color: "rgba(100,116,139,0.6)" }}
      >
        {String(index + 1).padStart(2, "0")}
      </p>

      <span
        className="text-sm font-semibold uppercase tracking-widest mb-3 block"
        style={{ color: slide.accent }}
      >
        {slide.label}
      </span>

      <h3
        className="text-5xl font-semibold text-rateup-blue leading-tight mb-6"
        style={{ fontFamily: "Degular Display, Georgia, serif", maxWidth: 480 }}
      >
        {slide.title}
      </h3>

      <p
        className="text-xl text-gray-500 leading-relaxed mb-8"
        style={{ maxWidth: 460, letterSpacing: "0.3px" }}
      >
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
      <Link
        to={slide.href}
        className="inline-flex mt-3 items-center gap-2 w-fit px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition"
      >
        Know more <ArrowIcon />
      </Link>
    </div>
  );
});

// ─── Arrow icon ────────────────────────────────────────────────────────────────
function ArrowIcon() {
  return (
    <svg
      stroke="currentColor"
      fill="none"
      strokeWidth={2}
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
    >
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  );
}

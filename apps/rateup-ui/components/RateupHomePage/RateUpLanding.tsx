import { useState } from "react";

import Hero from "@/components/RateupHomePage/helper/Hero";

import Clients from "./helper/Clients";
import { CTA } from "./helper/CTA";
import { FeaturesGrid } from "./helper/FeaturesGrid";
import { FeatureShowcase } from "./helper/FeatureShowcase";
import { Footer } from "./helper/Footer";
import { Integrations } from "./helper/Integratons";
import { Pricing } from "./helper/Pricing";
import Stats from "./helper/Stats";
import StatsBar from "./helper/StatsBar";
import { Testimonials } from "./helper/Testimonials";

const RadarBackground = () => (
  <svg
    viewBox="0 0 720 491"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full"
    preserveAspectRatio="xMidYMax meet"
    aria-hidden="true"
  >
    {/* Dashed concentric semicircles */}
    <circle
      cx="200"
      cy="200"
      r="199"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 160 290.784)"
      stroke="url(#h_p0)"
      strokeWidth="2"
      strokeDasharray="3.48 3.48"
    />
    <circle
      cx="190"
      cy="190"
      r="189.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 170 300.784)"
      stroke="url(#h_p1)"
      strokeDasharray="3.3 3.3"
    />
    <circle
      cx="180"
      cy="180"
      r="179.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 180 310.784)"
      stroke="url(#h_p2)"
      strokeDasharray="3.13 3.13"
    />
    <circle
      cx="170"
      cy="170"
      r="169.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 190 320.784)"
      stroke="url(#h_p3)"
      strokeDasharray="2.96 2.96"
    />
    <circle
      cx="160"
      cy="160"
      r="159.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 200 330.784)"
      stroke="url(#h_p4)"
      strokeDasharray="2.78 2.78"
    />
    <circle
      cx="150"
      cy="150"
      r="149.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 210 340.784)"
      stroke="url(#h_p5)"
      strokeDasharray="2.61 2.61"
    />
    <circle
      cx="140"
      cy="140"
      r="139.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 220 350.784)"
      stroke="url(#h_p6)"
      strokeDasharray="2.43 2.43"
    />
    <circle
      cx="130"
      cy="130"
      r="129.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 230 360.784)"
      stroke="url(#h_p7)"
      strokeDasharray="2.26 2.26"
    />
    <circle
      cx="120"
      cy="120"
      r="119.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 240 370.784)"
      stroke="url(#h_p8)"
      strokeDasharray="2.09 2.09"
    />
    <circle
      cx="110"
      cy="110"
      r="109.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 250 380.784)"
      stroke="url(#h_p9)"
      strokeDasharray="1.91 1.91"
    />
    <circle
      cx="100"
      cy="100"
      r="99.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 260 390.784)"
      stroke="url(#h_p10)"
      strokeDasharray="1.74 1.74"
    />
    <circle
      cx="90"
      cy="90"
      r="89.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 270 400.784)"
      stroke="url(#h_p11)"
      strokeDasharray="1.57 1.57"
    />
    <circle
      cx="80"
      cy="80"
      r="79.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 280 410.784)"
      stroke="url(#h_p12)"
      strokeDasharray="1.39 1.39"
    />
    <circle
      cx="190"
      cy="190"
      r="189.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 170 300.784)"
      stroke="url(#h_p13)"
      strokeDasharray="3.3 3.3"
    />
    <circle
      cx="210"
      cy="210"
      r="209"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 150 280.784)"
      stroke="url(#h_p14)"
      strokeWidth="2"
      strokeDasharray="3.65 3.65"
    />
    <circle
      cx="220"
      cy="220"
      r="219"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 140 270.784)"
      stroke="url(#h_p15)"
      strokeWidth="2"
      strokeDasharray="3.83 3.83"
    />
    <circle
      cx="230"
      cy="230"
      r="229"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 130 260.784)"
      stroke="url(#h_p16)"
      strokeWidth="2"
      strokeDasharray="4 4"
    />
    <circle
      cx="240"
      cy="240"
      r="239"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 120 250.784)"
      stroke="url(#h_p17)"
      strokeWidth="2"
      strokeDasharray="4.17 4.17"
    />
    <circle
      cx="250"
      cy="250"
      r="249"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 110 240.784)"
      stroke="url(#h_p18)"
      strokeWidth="2"
      strokeDasharray="4.35 4.35"
    />
    <circle
      cx="260"
      cy="260"
      r="259"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 100 230.784)"
      stroke="url(#h_p19)"
      strokeWidth="2"
      strokeDasharray="4.52 4.52"
    />
    <circle
      cx="270"
      cy="270"
      r="268.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 90 220.784)"
      stroke="url(#h_p20)"
      strokeWidth="3"
      strokeDasharray="4.7 4.7"
    />
    <circle
      cx="280"
      cy="280"
      r="278.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 80 210.784)"
      stroke="url(#h_p21)"
      strokeWidth="3"
      strokeDasharray="4.87 4.87"
    />
    <circle
      cx="290"
      cy="290"
      r="288.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 70 200.784)"
      stroke="url(#h_p22)"
      strokeWidth="3"
      strokeDasharray="5.04 5.04"
    />
    <circle
      cx="300"
      cy="300"
      r="298.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 60 190.784)"
      stroke="url(#h_p23)"
      strokeWidth="3"
      strokeDasharray="5.22 5.22"
    />
    <circle
      cx="310"
      cy="310"
      r="308.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 50 180.784)"
      stroke="url(#h_p24)"
      strokeWidth="3"
      strokeDasharray="5.39 5.39"
    />
    <circle
      cx="320"
      cy="320"
      r="318.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 40 170.784)"
      stroke="url(#h_p25)"
      strokeWidth="3"
      strokeDasharray="5.57 5.57"
    />
    <circle
      cx="330"
      cy="330"
      r="328.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 30 160.784)"
      stroke="url(#h_p26)"
      strokeWidth="3"
      strokeDasharray="5.74 5.74"
    />
    <circle
      cx="340"
      cy="340"
      r="338.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 20 150.784)"
      stroke="url(#h_p27)"
      strokeWidth="3"
      strokeDasharray="5.91 5.91"
    />
    <circle
      cx="350"
      cy="350"
      r="348.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 10 140.784)"
      stroke="url(#h_p28)"
      strokeWidth="3"
      strokeDasharray="6.09 6.09"
    />
    <circle
      cx="360"
      cy="360"
      r="358.5"
      transform="matrix(-4.37114e-08 1 1 4.37114e-08 0 130.784)"
      stroke="url(#h_p29)"
      strokeWidth="3"
      strokeDasharray="6.26 6.26"
    />

    {/* Light beam layers */}
    <g filter="url(#h_f0)">
      <path
        d="M280 506.731C366.434 413.698 352.579 114.543 352.579 52.7844L367.429 52.7844C367.429 114.543 353.573 413.368 440.008 506.731L280 506.731Z"
        fill="url(#h_p30)"
      />
    </g>
    <g filter="url(#h_f1)">
      <path
        d="M280 506.731C366.434 413.698 352.579 114.543 352.579 52.7844L367.429 52.7844C367.429 114.543 353.573 413.368 440.008 506.731L280 506.731Z"
        fill="url(#h_p31)"
      />
    </g>
    <g filter="url(#h_f2)">
      <path
        d="M280 506.731C366.434 413.698 352.579 114.543 352.579 52.7844L367.429 52.7844C367.429 114.543 353.573 413.368 440.008 506.731L280 506.731Z"
        fill="url(#h_p32)"
      />
    </g>
    <g filter="url(#h_f3)">
      <path
        d="M280 506.731C366.434 413.698 352.579 114.543 352.579 52.7844L367.429 52.7844C367.429 114.543 353.573 413.368 440.008 506.731L280 506.731Z"
        fill="url(#h_p33)"
      />
    </g>

    <defs>
      {/* Filters */}
      {[0, 1, 2].map((i) => (
        <filter
          key={i}
          id={`h_f${i}`}
          x="227.215"
          y="-7.62939e-05"
          width="265.577"
          height="559.515"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="26.3923"
            result="effect1_foregroundBlur"
          />
        </filter>
      ))}
      <filter
        id="h_f3"
        x="253.608"
        y="26.3922"
        width="212.792"
        height="506.731"
        filterUnits="userSpaceOnUse"
        colorInterpolationFilters="sRGB"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix" />
        <feBlend
          mode="normal"
          in="SourceGraphic"
          in2="BackgroundImageFix"
          result="shape"
        />
        <feGaussianBlur
          stdDeviation="13.1961"
          result="effect1_foregroundBlur"
        />
      </filter>

      {/* Circle gradients — all go from #004F98 to #001747 */}
      {Array.from({ length: 30 }, (_, i) => {
        const r = (i < 13 ? 20 - i : i === 13 ? 19 : 21 + (i - 14)) * 20;
        const id = `h_p${i}`;
        return (
          <linearGradient
            key={id}
            id={id}
            x1={r}
            y1={r / 2}
            x2="0"
            y2={r / 2}
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#004F98" />
            <stop offset="1" stopColor="#001747" />
          </linearGradient>
        );
      })}

      {/* Beam gradients */}
      <linearGradient
        id="h_p30"
        x1="360.004"
        y1="52.7844"
        x2="360.004"
        y2="506.731"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#0045CC" stopOpacity="0" />
        <stop offset="1" stopColor="#0045CC" />
      </linearGradient>
      <linearGradient
        id="h_p31"
        x1="360.004"
        y1="52.7844"
        x2="360.004"
        y2="506.731"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#0045CC" stopOpacity="0" />
        <stop offset="1" stopColor="#0045CC" />
      </linearGradient>
      <linearGradient
        id="h_p32"
        x1="360.004"
        y1="52.7844"
        x2="360.004"
        y2="506.731"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#0045CC" stopOpacity="0" />
        <stop offset="1" stopColor="#0045CC" />
      </linearGradient>
      <linearGradient
        id="h_p33"
        x1="360.004"
        y1="52.7844"
        x2="360.004"
        y2="506.731"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0.4" stopColor="white" stopOpacity="0" />
        <stop offset="0.88" stopColor="white" />
        <stop offset="1" stopColor="white" />
      </linearGradient>
    </defs>
  </svg>
);

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

const card = {
  background: C.bg2,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 24,
};
const imgBox = {
  background: C.bg3,
  borderRadius: 12,
  aspectRatio: "16/9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const ImgPlaceholder = () => (
  <svg
    width="40"
    height="40"
    fill="none"
    viewBox="0 0 24 24"
    stroke="#334155"
    strokeWidth={1}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const Check = ({ color = C.blue }) => (
  <svg
    width="13"
    height="13"
    fill="none"
    viewBox="0 0 24 24"
    stroke={color}
    strokeWidth={2.5}
    style={{ flexShrink: 0 }}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const Btn = ({ children, variant = "primary", style: extra = {}, onClick }) => {
  const base = {
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 10,
    padding: "10px 20px",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "opacity .15s",
  };
  const v = {
    primary: { ...base, background: C.blue, color: "#fff", border: "none" },
    outline: {
      ...base,
      background: "transparent",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.2)",
    },
    ghost: {
      ...base,
      background: "rgba(24,115,232,0.1)",
      color: "#93c5fd",
      border: "1px solid rgba(24,115,232,0.3)",
      borderRadius: 999,
    },
  };
  return (
    <button
      style={{ ...v[variant], ...extra }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = ".8")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default function RateUpLanding() {
  const [annual, setAnnual] = useState(false);

  return (
    <div
      className="bg-rateup-dark-blue"
      style={{
        color: C.text1,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        lineHeight: 1.6,
        minHeight: "100vh",
      }}
    >
      <Hero />
      <Stats />
      <Clients />
      <FeatureShowcase />
      <FeaturesGrid />
      <Integrations />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}

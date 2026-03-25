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

const FEATURE_CARDS = [
  {
    title: "WhatsApp AI Chatbot",
    desc: "Automate customer conversations with AI-powered WhatsApp chatbot that handles queries, bookings, and support 24/7 without human intervention.",
  },
  {
    title: "CX & Feedback Analytics",
    desc: "Get deep insights into customer experience with powerful analytics dashboards that track satisfaction scores, feedback trends, and team performance.",
  },
  {
    title: "Campaign Manager",
    desc: "Launch targeted marketing campaigns across multiple channels. Segment audiences, schedule messages, and track performance in real-time.",
  },
  {
    title: "Ticketing & Escalation",
    desc: "Smart ticketing system that automatically routes and escalates issues to the right team member based on priority and availability.",
  },
  {
    title: "QR Studio",
    desc: "Create branded QR codes for feedback collection, product info, and customer engagement. Track scans and conversions with built-in analytics.",
  },
  {
    title: "Your Analytics & Reports, On The Go",
    desc: "Access comprehensive business reports from anywhere. Real-time dashboards and automated insights delivered to your device.",
    hasAppButtons: true,
  },
];

const PRICING = [
  {
    name: "START",
    price: "$49",
    period: "/mo",
    features: [
      "Basic chatbot flows",
      "Up to 1,000 conversations",
      "Email support",
      "Basic analytics",
      "1 WhatsApp number",
      "QR Studio (basic)",
      "Campaign manager",
      "API access",
    ],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "POPULAR",
    price: "$149",
    period: "/mo",
    features: [
      "Advanced AI chatbot",
      "Unlimited conversations",
      "Priority support 24/7",
      "Advanced analytics",
      "5 WhatsApp numbers",
      "Full QR Studio",
      "Campaign manager Pro",
      "Full API access",
      "Custom integrations",
      "Team collaboration",
    ],
    cta: "Get Started Free",
    highlighted: true,
  },
  {
    name: "BASICS",
    price: "Custom",
    period: "",
    features: [
      "Everything in Popular",
      "Unlimited numbers",
      "Dedicated account manager",
      "Custom AI training",
      "SLA guarantee",
      "On-premise option",
      "Custom reporting",
      "White-label option",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const FOOTER_COLS = [
  {
    title: "Features",
    links: [
      "WhatsApp Chatbot",
      "CX Analytics",
      "Campaign Manager",
      "Ticketing",
      "QR Studio",
      "Inbox",
    ],
  },
  {
    title: "Company",
    links: ["About Us", "Careers", "Blog", "Press", "Partners", "Contact"],
  },
  {
    title: "Resources",
    links: [
      "Documentation",
      "API Reference",
      "Help Center",
      "Community",
      "Status",
      "Changelog",
    ],
  },
  {
    title: "Legal",
    links: [
      "Privacy Policy",
      "Terms of Service",
      "Cookie Policy",
      "GDPR",
      "Security",
    ],
  },
];

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
      <StatsBar />
      <Stats />
      <Clients />
      <FeatureShowcase />
      <FeaturesGrid />
      <Integrations />
      {/* ── TESTIMONIALS ── */}
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
      {/* ── FOOTER ── */}
      {/* <footer
        style={{
          background: C.bg0,
          borderTop: `1px solid ${C.border}`,
          padding: "56px 24px 32px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
              gap: 40,
              marginBottom: 48,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    background: C.blue,
                    borderRadius: 7,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: 13,
                  }}
                >
                  R
                </div>
                <span style={{ fontWeight: 800, fontSize: 15 }}>RateUp</span>
              </div>
              <p
                style={{
                  color: C.text3,
                  fontSize: 12,
                  lineHeight: 1.7,
                  marginBottom: 18,
                  maxWidth: 240,
                }}
              >
                The all-in-one post-purchase customer experience platform
                helping businesses retain and grow their customer base.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {["T", "L", "Y", "I"].map((s) => (
                  <div
                    key={s}
                    style={{
                      width: 28,
                      height: 28,
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      color: C.text3,
                      cursor: "pointer",
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>
            {FOOTER_COLS.map((col) => (
              <div key={col.title}>
                <h4
                  style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 700 }}
                >
                  {col.title}
                </h4>
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {col.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#"
                        style={{
                          color: C.text3,
                          fontSize: 12,
                          textDecoration: "none",
                        }}
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              paddingTop: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <p style={{ margin: 0, fontSize: 11, color: C.text3 }}>
              © 2026 RateUp. All rights reserved.
            </p>
            <div style={{ display: "flex", gap: 20 }}>
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(
                (l) => (
                  <a
                    key={l}
                    href="#"
                    style={{
                      fontSize: 11,
                      color: C.text3,
                      textDecoration: "none",
                    }}
                  >
                    {l}
                  </a>
                ),
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["App Store", "Google Play"].map((s) => (
                <div
                  key={s}
                  style={{
                    background: "#000",
                    border: `1px solid ${C.border}`,
                    borderRadius: 7,
                    padding: "5px 10px",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 9, color: C.text3 }}>
                    Download on
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      fontWeight: 700,
                      color: C.text1,
                    }}
                  >
                    {s}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer> */}
    </div>
  );
}

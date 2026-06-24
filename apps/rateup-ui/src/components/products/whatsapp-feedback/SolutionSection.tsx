import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal";

import style from "./feedback.module.css";

function Stars({ n }) {
  return (
    <div className="flex gap-px">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className="w-[11px] h-[11px]"
          viewBox="0 0 24 24"
          fill={i < n ? "#F8951D" : "none"}
          stroke="#F8951D"
          strokeWidth="2"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function CopyBlock({ eyebrow, h3, p, pills }) {
  const navigate = useNavigate();
  return (
    <div>
      <p className="text-[12px] font-bold tracking-[0.08em] uppercase text-wa-green mb-3.5">
        {eyebrow}
      </p>
      <h6 className="font-nunito font-extrabold text-[clamp(28px,3.6vw,48px)] leading-[1.06] tracking-[-0.025em] text-white">
        {h3}
      </h6>
      <p className="text-white/70 text-[16px] leading-[1.6] mt-5 mb-[22px] max-w-[460px]">{p}</p>
      <div className="flex flex-wrap gap-2.5 mb-7">
        {pills.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/80 bg-white/[0.05] border border-white/10 rounded-full py-[7px] px-[15px] before:content-[''] before:w-[7px] before:h-[7px] before:rounded-full before:bg-wa-green before:flex-shrink-0"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="flex gap-3.5 flex-wrap">
        <button
          onClick={() => navigate({ to: "/signup" })}
          className="inline-flex items-center gap-3 border-0 rounded-2xl font-extrabold text-base tracking-[-0.01em] pl-[22px] py-[6px] pr-[6px] text-white bg-gradient-to-br from-fb-green to-fb-green-2 shadow-[0_10px_26px_rgba(42,98,84,0.40)] hover:shadow-[0_14px_34px_rgba(42,98,84,0.55)] hover:-translate-y-0.5 active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap"
        >
          Start Free Trial
          <span className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-chip-dark flex-shrink-0">
            <svg
              className="w-[18px] h-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </span>
        </button>
        <BookDemoModal>
          <button className="inline-flex items-center gap-3 border-0 rounded-2xl font-extrabold text-base pl-[22px] py-[6px] pr-[6px] text-[#0F2820] bg-periwinkle hover:bg-periwinkle-2 hover:-translate-y-0.5 active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap">
            See Demo
            <span className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-white/65 flex-shrink-0">
              <svg
                className="w-[18px] h-[18px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </span>
          </button>
        </BookDemoModal>
      </div>
    </div>
  );
}

const triggerIcon = (color) => ({
  purchase: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  dining: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11l18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  ),
  appointment: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  followup: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  support: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
});

function TriggersTab() {
  const triggers = [
    {
      bg: "#EBF5F1",
      color: "#2A6254",
      label: "After Purchase",
      sub: "Triggers 1 hour after order confirmed",
      iconKey: "purchase",
    },
    {
      bg: "#FEF3E8",
      color: "#D97A0F",
      label: "After Dining",
      sub: "Sends 15 min after table checkout",
      iconKey: "dining",
    },
    {
      bg: "#EEF2FB",
      color: "#3D6CD4",
      label: "Post Appointment",
      sub: "Fires 30 min after service ends",
      iconKey: "appointment",
    },
    {
      bg: "#F5F0FE",
      color: "#7A5CE0",
      label: "Follow-Up (7 days)",
      sub: "Re-engages customers after first visit",
      iconKey: "followup",
    },
    {
      bg: "#E9F8EE",
      color: "#16A34A",
      label: "After Support Resolved",
      sub: "Checks CSAT after ticket is closed",
      iconKey: "support",
    },
  ];

  return (
    <>
      <div className="bg-[#0b1a10] rounded-[20px] overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
        <div className="absolute top-[-50px] left-[-40px] w-[280px] h-[250px] bg-[radial-gradient(circle,rgba(37,211,102,0.30),transparent_70%)] blur-[10px] pointer-events-none" />
        <div className="bg-white m-4 rounded-2xl p-4 pb-[18px] min-h-[310px]">
          <div className="flex items-center gap-2 font-extrabold text-[#111] text-sm mb-[3px]">
            <svg
              className="w-[18px] h-[18px] text-fb-green flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Feedback Automation Triggers
          </div>
          <p className="text-[11px] text-[#9098a3] mb-3.5 pl-[26px]">
            Active for your account · fires automatically
          </p>
          {triggers.map((t) => (
            <div
              key={t.label}
              className="flex items-center gap-2.5 py-[9px] border-b border-[#f1f2f4] last:border-0"
            >
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{ background: t.bg }}
              >
                <span className="w-[18px] h-[18px] flex items-center justify-center">
                  {triggerIcon(t.color)[t.iconKey]}
                </span>
              </div>
              <div>
                <div className="text-[13px] text-[#111] font-bold leading-tight">{t.label}</div>
                <div className="text-[11px] text-[#9098a3] mt-[1px]">{t.sub}</div>
              </div>
              <span className="text-[10.5px] font-bold py-[3px] px-[9px] rounded-[6px] bg-[#E6F4EE] text-fb-green ml-auto flex-shrink-0">
                ● Active
              </span>
            </div>
          ))}
        </div>
      </div>
      <CopyBlock
        eyebrow="AUTO-TRIGGERS"
        h3="Send Feedback at the Perfect Moment"
        p="Automated triggers fire at exactly the right time — after a purchase, dining experience, appointment, or support resolution. No manual sending required. RateUp handles it 24/7."
        pills={["Post-Purchase", "Post-Visit", "After Service", "Custom Events", "24/7 Automated"]}
      />
    </>
  );
}

function FlowsTab() {
  return (
    <>
      <div className="bg-[#0b1a10] rounded-[20px] overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
        <div className="absolute top-[-50px] left-[-40px] w-[280px] h-[250px] bg-[radial-gradient(circle,rgba(37,211,102,0.30),transparent_70%)] blur-[10px] pointer-events-none" />
        <div className="bg-white m-4 rounded-2xl p-4 pb-[18px] min-h-[310px]">
          <div className="flex items-center gap-2 font-extrabold text-[#111] text-sm mb-[3px]">
            <svg
              className="w-[18px] h-[18px] text-fb-green flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Feedback Flow Builder
          </div>
          <p className="text-[11px] text-ink-500 mb-3.5 pl-[26px]">
            Interactive forms native to WhatsApp · no links, no redirects
          </p>
          <div className="bg-[#f6f8fc] rounded-[10px] px-3 py-2.5 mb-2">
            <div className="text-[11px] font-bold text-ink-400 uppercase tracking-[0.05em] mb-1">
              Question 1
            </div>
            <div className="text-[13px] font-bold text-[#111]">
              How would you rate your overall experience?
            </div>
            <div className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-fb-green bg-[#EBF5F1] rounded-[6px] px-2 py-[3px] mt-1.5">
              <svg
                className="w-[11px] h-[11px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Star Rating 1–5
            </div>
          </div>
          <div className="bg-[#f6f8fc] rounded-[10px] px-3 py-2.5 mb-2">
            <div className="text-[11px] font-bold text-ink-400 uppercase tracking-[0.05em] mb-1">
              Question 2
            </div>
            <div className="text-[13px] font-bold text-[#111]">
              What did you enjoy most about your visit?
            </div>
            <div className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-fb-green bg-[#EBF5F1] rounded-[6px] px-2 py-[3px] mt-1.5">
              <svg
                className="w-[11px] h-[11px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 8 12 12 14 14" />
              </svg>
              Multiple Choice
            </div>
          </div>
          <div className="bg-[#f6f8fc] rounded-[10px] px-3 py-2.5 mb-2">
            <div className="text-[11px] font-bold text-ink-400 uppercase tracking-[0.05em] mb-1">
              Question 3
            </div>
            <div className="text-[13px] font-bold text-[#111]">
              Any other comments or suggestions for us?
            </div>
            <div className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-fb-green bg-[#EBF5F1] rounded-[6px] px-2 py-[3px] mt-1.5">
              <svg
                className="w-[11px] h-[11px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="17" y1="10" x2="3" y2="10" />
                <line x1="21" y1="6" x2="3" y2="6" />
                <line x1="21" y1="14" x2="3" y2="14" />
                <line x1="17" y1="18" x2="3" y2="18" />
              </svg>
              Open Text
            </div>
          </div>
          <div
            className="bg-[#f6f8fc] rounded-[10px] px-3 py-2.5 mb-2"
            style={{ border: "2px dashed #d1e8e2", background: "#f8fdfb" }}
          >
            <div
              className="text-[11px] font-bold uppercase tracking-[0.05em] mb-1"
              style={{ color: "#2A6254" }}
            >
              + Add Question
            </div>
            <div style={{ color: "#9098a3", fontWeight: 400, fontSize: 12 }}>
              NPS, CSAT, Rating, Multiple Choice, Open Text…
            </div>
          </div>
        </div>
      </div>
      <CopyBlock
        eyebrow="WHATSAPP FLOWS"
        h3="Interactive Forms Native to WhatsApp"
        p="Build multi-question feedback forms that live inside WhatsApp. Customers respond without leaving the app — no links, no external pages. Completion rates are 3× higher than web forms."
        pills={[
          "Star Ratings",
          "Multiple Choice",
          "Open Text",
          "NPS Score",
          "CSAT",
          "No Redirects",
        ]}
      />
    </>
  );
}

function AnalyticsTab() {
  const bars = [
    { l: "Mon", h: 58 },
    { l: "Tue", h: 74 },
    { l: "Wed", h: 62 },
    { l: "Thu", h: 88 },
    { l: "Fri", h: 100 },
    { l: "Sat", h: 92 },
    { l: "Sun", h: 70 },
  ];

  return (
    <>
      <div className="bg-[#0b1a10] rounded-[20px] overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
        <div className="absolute top-[-50px] left-[-40px] w-[280px] h-[250px] bg-[radial-gradient(circle,rgba(37,211,102,0.30),transparent_70%)] blur-[10px] pointer-events-none" />
        <div className="bg-white m-4 rounded-2xl p-4 pb-[18px] min-h-[310px]">
          <div className="flex items-center gap-2 font-extrabold text-[#111] text-sm mb-[3px]">
            <svg
              className="w-[18px] h-[18px] text-fb-green flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Feedback Analytics Dashboard
          </div>
          <p className="text-[11px] text-[#9098a3] mb-3.5 pl-[26px]">
            Last 7 days · real-time · all channels
          </p>
          <div className="grid grid-cols-3 gap-2 mb-3.5">
            <div className="bg-[#f6f8fc] rounded-[10px] p-2.5">
              <div className="font-nunito font-black text-[19px] text-fb-green tracking-[-0.02em]">
                662
              </div>
              <div className="text-[10px] text-[#6b7280] mt-0.5 leading-tight">
                Responses This Week
              </div>
            </div>
            <div className="bg-[#f6f8fc] rounded-[10px] p-2.5">
              <div className="font-nunito font-black text-[19px] text-fb-green tracking-[-0.02em]">
                35%
              </div>
              <div className="text-[10px] text-[#6b7280] mt-0.5 leading-tight">Response Rate</div>
            </div>
            <div className="bg-[#f6f8fc] rounded-[10px] p-2.5">
              <div className="font-nunito font-black text-[19px] text-fb-green tracking-[-0.02em]">
                4.8★
              </div>
              <div className="text-[10px] text-[#6b7280] mt-0.5 leading-tight">Avg Rating</div>
            </div>
          </div>
          <div className="flex items-end gap-[7px] h-[100px] pt-2">
            {bars.map((b) => (
              <div
                key={b.l}
                className="flex-1 flex flex-col items-center gap-[5px] h-full justify-end"
              >
                <i
                  className="w-full rounded-t-[5px] bg-gradient-to-b from-fb-green-2 to-fb-green"
                  style={{ height: `${b.h}%` }}
                />
                <span className="text-[9px] text-[#9098a3] font-semibold">{b.l}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "#2A6254",
                background: "#EBF5F1",
                padding: "3px 8px",
                borderRadius: 6,
              }}
            >
              😊 Positive 78%
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "#D97A0F",
                background: "#FEF3E8",
                padding: "3px 8px",
                borderRadius: 6,
              }}
            >
              😐 Neutral 14%
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "#DC2626",
                background: "#FFF0F0",
                padding: "3px 8px",
                borderRadius: 6,
              }}
            >
              😟 Negative 8%
            </span>
          </div>
        </div>
      </div>
      <CopyBlock
        eyebrow="REAL-TIME ANALYTICS"
        h3="Turn Feedback Into Actionable Insights"
        p="See response rates, sentiment breakdowns, CSAT trends, and NPS scores in a single real-time dashboard. Drill into individual responses or zoom out to spot patterns across time and segments."
        pills={[
          "Real-Time Data",
          "Sentiment Analysis",
          "CSAT Trends",
          "NPS Tracking",
          "Export Reports",
        ]}
      />
    </>
  );
}

function FollowupTab() {
  const rules = [
    { n: 5, action: "Request Google Review", color: "#16A34A" },
    { n: 4, action: "Send Referral Offer", color: "#2A6254" },
    { n: 3, action: "Ask for More Detail", color: "#D97A0F" },
    { n: 2, action: "Escalate to Manager", color: "#E3506B" },
    { n: 1, action: "🚨 Urgent Alert", color: "#DC2626" },
  ];

  return (
    <>
      <div className="bg-[#0b1a10] rounded-[20px] overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
        <div className="absolute top-[-50px] left-[-40px] w-[280px] h-[250px] bg-[radial-gradient(circle,rgba(37,211,102,0.30),transparent_70%)] blur-[10px] pointer-events-none" />
        <div className="bg-white m-4 rounded-2xl p-4 pb-[18px] min-h-[310px]">
          <div className="flex items-center gap-2 font-extrabold text-[#111] text-sm mb-[3px]">
            <svg
              className="w-[18px] h-[18px] text-fb-green flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
            Smart Follow-Up Rules
          </div>
          <p className="text-[11px] text-[#9098a3] mb-3.5 pl-[26px]">
            Automated actions triggered by feedback score
          </p>
          {rules.map((r) => (
            <div
              key={r.n}
              className="flex items-center gap-2.5 py-[9px] border-b border-[#f1f2f4] last:border-0"
            >
              <Stars n={r.n} />
              <div className="text-[12px] text-[#111] font-semibold ml-2.5">
                {r.n} Star{r.n !== 1 ? "s" : ""}
              </div>
              <div className="text-[12px] font-bold ml-auto" style={{ color: r.color }}>
                {r.action} →
              </div>
            </div>
          ))}
          <div
            style={{
              marginTop: 14,
              background: "#f6f8fc",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#9098a3",
                marginBottom: 4,
              }}
            >
              LAST ESCALATION
            </div>
            <div style={{ fontSize: 13, color: "#111", fontWeight: 700 }}>
              Rahul M. left 2★ · 14 min ago
            </div>
            <div style={{ fontSize: 11, color: "#9098a3" }}>Assigned to Neha S. · Support Team</div>
          </div>
        </div>
      </div>
      <CopyBlock
        eyebrow="SMART FOLLOW-UP"
        h3="Respond Automatically Based on Score"
        p="Set rules to send thank-you offers for 5-star reviews, request Google ratings from happy customers, escalate bad experiences instantly to your team — all running on autopilot, around the clock."
        pills={[
          "Auto-Escalation",
          "Review Requests",
          "Discount Triggers",
          "Team Alerts",
          "24/7 Autopilot",
        ]}
      />
    </>
  );
}

const tabs = [
  {
    id: "triggers",
    label: "Auto-Triggers",
    icon: (
      <svg
        className="w-[18px] h-[18px] flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    content: <TriggersTab />,
  },
  {
    id: "flows",
    label: "WhatsApp Flows",
    icon: (
      <svg
        className="w-[18px] h-[18px] flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    content: <FlowsTab />,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: (
      <svg
        className="w-[18px] h-[18px] flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    content: <AnalyticsTab />,
  },
  {
    id: "followup",
    label: "Smart Follow-Up",
    icon: (
      <svg
        className="w-[18px] h-[18px] flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="9 17 4 12 9 7" />
        <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
      </svg>
    ),
    content: <FollowupTab />,
  },
];

export default function SolutionSection() {
  const [activeTab, setActiveTab] = useState("triggers");
  const active = tabs.find((t) => t.id === activeTab);

  return (
    <section className="bg-ink-25 py-24 pb-[100px]" id="solution">
      <div className="max-w-[1200px] mx-auto px-5 md:px-8">
        <div className={`text-center max-w-[760px] mx-auto ${style.reveal}`}>
          <h2 className="font-nunito font-extrabold text-[clamp(30px,4vw,50px)] tracking-[-0.025em] leading-[1.08] text-ink-800">
            RateUp + WhatsApp: The Feedback
            <br />
            Solution That Actually Works
          </h2>
          <p className="mt-4 text-[17px] leading-[1.55] text-ink-500">
            Boost your response rate by up to 35%. RateUp leverages WhatsApp Flows — native,
            interactive forms inside the world's most popular messaging app — so customers engage
            effortlessly.
          </p>
        </div>

        <div className="mt-[60px] bg-[#050F0A] rounded-[30px] p-5 md:p-10 relative overflow-hidden shadow-[0_40px_90px_rgba(5,14,9,0.40)]">
          <div className="absolute top-[-90px] left-1/2 -translate-x-1/2 w-[440px] h-[320px] bg-[radial-gradient(circle,rgba(37,211,102,0.10),transparent_70%)] pointer-events-none" />

          <div className="flex items-center gap-1.5 justify-center mb-6 md:mb-8 flex-wrap">
            {tabs.map((t) => (
              <button
                key={t.id}
                className={
                  activeTab === t.id
                    ? "inline-flex items-center gap-1.5 bg-fb-green text-white font-bold text-[13px] md:text-[15px] px-3 md:px-[18px] py-2 md:py-3 rounded-xl cursor-pointer border-0"
                    : "inline-flex items-center gap-1.5 text-white/50 font-bold text-[13px] md:text-[15px] px-3 md:px-[18px] py-2 md:py-3 rounded-xl cursor-pointer hover:text-white hover:bg-white/[0.07] transition-colors border-0 bg-transparent"
                }
                onClick={() => setActiveTab(t.id)}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div
            className="grid grid-cols-[1.08fr_0.92fr] gap-10 items-center animate-panel-fade max-lg:grid-cols-1"
            key={activeTab}
          >
            {active?.content}
          </div>
        </div>
      </div>
    </section>
  );
}

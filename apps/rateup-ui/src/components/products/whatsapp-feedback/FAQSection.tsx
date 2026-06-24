import { useEffect, useRef, useState } from "react";

import style from "./feedback.module.css";

const faqs = [
  {
    q: "Do I need a separate WhatsApp Business API account?",
    a: "No — RateUp handles the WhatsApp Business API connection for you. We set it up as part of onboarding, typically in under 24 hours. You do not need a separate Meta or BSP account.",
  },
  {
    q: "Is RateUp compliant with WhatsApp policies and GDPR?",
    a: "Yes. RateUp is built on the official WhatsApp Business API and follows Meta's messaging policies, including opt-in requirements and approved message templates. All data is processed in compliance with GDPR, and customer consent is collected before any message is sent.",
  },
  {
    q: "How does the integration with CRM and billing systems work?",
    a: "RateUp integrates with Shopify, WooCommerce, Zoho CRM, HubSpot, and major billing systems via native connectors and Webhooks. When a purchase or appointment is recorded in your system, RateUp automatically triggers the feedback flow — no manual export required.",
  },
  {
    q: "How many questions can I include in a feedback survey?",
    a: "You can include up to 10 questions per WhatsApp Flow. We support star ratings, multiple-choice, NPS (0–10 scale), CSAT, and open-text responses. Flows can be branched so follow-up questions adapt based on earlier answers.",
  },
  {
    q: "What kind of support do you offer?",
    a: "All plans include live chat support (Mon–Sat, 9 AM–9 PM IST), a detailed help center, and onboarding assistance. Higher-tier plans include a dedicated account manager and priority response times.",
  },
  {
    q: "What does pricing look like?",
    a: "RateUp is priced at a flat $31/month, which includes the WhatsApp Feedback module, unlimited feedback flows, real-time analytics, and automated follow-ups. No per-message fees for feedback requests. See our pricing page for the full feature comparison.",
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const ansRef = useRef(null);
  const itemRef = useRef(null);

  useEffect(() => {
    if (ansRef.current) {
      ansRef.current.style.maxHeight = open ? ansRef.current.scrollHeight + "px" : "0";
    }
  }, [open]);

  useEffect(() => {
    if (!itemRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -8% 0px",
      },
    );
    observer.observe(itemRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={itemRef}
      className={`rounded-2xl overflow-hidden border transition-colors duration-200 ${style.reveal} ${revealed ? style.in : ""} ${open ? "border-[rgba(37,211,102,0.28)] bg-[rgba(37,211,102,0.04)]" : "bg-white/[0.04] border-white/10"}`}
    >
      <button
        className="w-full bg-transparent border-0 text-white text-left flex items-center justify-between gap-4 px-[26px] py-[22px] text-[17px] font-bold tracking-[-0.01em] cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <span>{q}</span>
        <div className="w-7 h-7 flex-shrink-0 relative">
          {/* Vertical line (collapses when open is true) */}
          <div
            className={`absolute left-1/2 top-[3px] w-[2.5px] h-[22px] -translate-x-1/2 bg-white/65 rounded-[2px] transition-transform duration-240 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "scale-y-0" : "scale-y-100"}`}
          />
          {/* Horizontal line */}
          <div className="absolute top-1/2 left-[3px] h-[2.5px] w-[22px] -translate-y-1/2 bg-white/65 rounded-[2px] transition-transform duration-240 ease-[cubic-bezier(0.22,1,0.36,1)]" />
        </div>
      </button>
      <div
        className="max-h-0 overflow-hidden transition-[max-height] duration-420 ease-[cubic-bezier(0.4,0,0.2,1)]"
        ref={ansRef}
      >
        <div className="px-[26px] pb-[22px] text-white/70 text-[15px] leading-[1.6] max-w-[680px]">
          {a}
        </div>
      </div>
    </div>
  );
}

export default function FAQSection() {
  return (
    <section
      className="bg-[radial-gradient(120%_120%_at_50%_-10%,#1A4035_0%,#0D2B22_50%,#081813_100%)] py-[100px] pb-[112px] text-white"
      id="faq"
    >
      <div className="max-w-[1200px] mx-auto px-5 md:px-8">
        <div className={`text-center max-w-[760px] mx-auto ${style.reveal}`}>
          <div className="inline-block text-[12px] font-bold tracking-[0.08em] uppercase text-white/60 bg-white/[0.08] border border-white/10 rounded-full py-1.5 px-4 mb-5">
            FAQ
          </div>
          <h6 className="font-display font-extrabold text-[clamp(30px,4vw,50px)] tracking-[-0.025em] leading-[1.08] text-white">
            Have Questions? We've Got Answers.
          </h6>
          <p className="mt-4 text-[17px] leading-[1.55] text-white/60">
            Find answers to common questions about RateUp and WhatsApp Surveys.
          </p>
        </div>

        <div className="max-w-[820px] mx-auto mt-[52px] flex flex-col gap-3.5">
          {faqs.map((f) => (
            <FAQItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

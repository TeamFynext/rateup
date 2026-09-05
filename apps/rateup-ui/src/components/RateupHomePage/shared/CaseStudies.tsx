import { useEffect, useState } from "react";

import { imagesPath } from "@/utils/constants";

import { CheckIcon, CountUp, Eyebrow, WhatsAppTile } from "./home-ui";

interface CaseStudy {
  initials: string;
  name: string;
  logo: string;
  sector: string;
  /** The headline number on the case's tab. */
  kpi: string;
  kpiLabel: string;
  stats: { k: string; v: string }[];
  steps: string[];
  quote: string;
  who: string;
  /** The WhatsApp message the case's campaign actually sends. */
  message: { title: string; body: string; note: string; cta: string; cta2: string };
}

const CASES: CaseStudy[] = [
  {
    initials: "BJ",
    name: "Bhima Jewellery",
    logo: `${imagesPath}/landing/logos/Bhima.png`,
    sector: "Jewellery retail · India",
    kpi: "3.1×",
    kpiLabel: "Campaign ROI",
    stats: [
      { k: "Campaign ROI", v: "3.1×" },
      { k: "Lead conversion", v: "+44%" },
      { k: "Open rate", v: "98%" },
    ],
    steps: [
      "Festive early-access campaign to repeat buyers in Kerala",
      "Live points balance shown inside the message",
      "Low ratings routed to a store manager within the hour",
    ],
    quote:
      "RateUp turned WhatsApp into our most powerful sales channel — campaigns go out in minutes and leads never fall through the cracks.",
    who: "Marketing team, Bhima Jewellery",
    message: {
      title: "Onam early access is open 🌼",
      body: "Hi Meera, your invite to the Onam collection is live until midnight. You have 240 RateUp points — that's ₹240 off, applied automatically at checkout.",
      note: "Code BHIMA240 · valid till 31 Aug · T&C apply",
      cta: "Shop early access",
      cta2: "Check my points",
    },
  },
  {
    initials: "SD",
    name: "ShopDoc",
    logo: `${imagesPath}/landing/logos/shopdoc.png`,
    sector: "Healthcare commerce · India",
    kpi: "92%",
    kpiLabel: "Message open rate",
    stats: [
      { k: "Open rate", v: "92%" },
      { k: "NPS points", v: "+27" },
      { k: "Faster resolution", v: "18h" },
    ],
    steps: [
      "Order and prescription updates moved from SMS to WhatsApp",
      "Refill reminders on a 30-day cycle",
      "Chatbot handles stock and timing questions before an agent sees them",
    ],
    quote:
      "Our WhatsApp open rates beat email by a mile — we fix issues before they ever become a bad review.",
    who: "Operations lead, ShopDoc",
    message: {
      title: "Refill due in 3 days 💊",
      body: "Hi Anand, your Metformin 500mg refill is due on 31 Aug. Reply here and we'll pack it today — delivery in 90 minutes across Kochi.",
      note: "Order #SD-20841 · pharmacist verified",
      cta: "Reorder now",
      cta2: "Talk to a pharmacist",
    },
  },
  {
    initials: "mG",
    name: "myG",
    logo: `${imagesPath}/landing/logos/myg.jpg`,
    sector: "Electronics retail · India",
    kpi: "3×",
    kpiLabel: "Repeat purchases",
    stats: [
      { k: "Repeat purchases", v: "3×" },
      { k: "Reward redemption", v: "41%" },
      { k: "Apps to install", v: "0" },
    ],
    steps: [
      "Loyalty points issued at billing across 200+ stores",
      "Win-back flow at 45 days on accessories and service",
      "Branch-level dashboards for store managers",
    ],
    quote:
      "Loyalty on WhatsApp meant zero friction for customers. It just works in the chat they already use.",
    who: "Retail operations, myG",
    message: {
      title: "You unlocked Gold tier ⭐",
      body: "Thanks for shopping at myG Kozhikode, Rahul. Your ₹42,000 in purchases just unlocked Gold — 1,200 points waiting, plus 2 years extended warranty on accessories.",
      note: "Points never expire while you stay Gold",
      cta: "Redeem 1,200 points",
      cta2: "See my tier",
    },
  },
  {
    initials: "MM",
    name: "Metro Medicals",
    logo: `${imagesPath}/landing/logos/metromedical.png`,
    sector: "Pharmacy chain · India",
    kpi: "94%",
    kpiLabel: "Feedback response",
    stats: [
      { k: "Feedback response", v: "94%" },
      { k: "Report queues", v: "Zero" },
      { k: "Patient satisfaction", v: "+31" },
    ],
    steps: [
      "One-tap rating sent after every delivery",
      "Negative feedback assigned to a pharmacist automatically",
      "Weekly sentiment report by branch",
    ],
    quote:
      "Patients get their lab reports on WhatsApp within minutes — and the feedback we collect helps us improve care every single day.",
    who: "Customer care, Metro Medicals",
    message: {
      title: "How was your delivery? ⭐",
      body: "Hi Fatima, order #MM-7742 was delivered at 4:15 PM today. Tap a star to rate it — a pharmacist reads every reply, and issues get fixed the same day.",
      note: "Takes 5 seconds · no app needed",
      cta: "Rate my order",
      cta2: "Report an issue",
    },
  },
];

/** How long each case holds before the rail advances. Keep in step with `--animate-ru-progress`. */
const CASE_DWELL_MS = 8000;

export default function CaseStudies() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const c = CASES[active];

  /* Auto-advance, but never over someone's shoulder: pointer or keyboard inside the section
     holds the current case, as does a backgrounded tab. `active` is a dependency so a manual
     pick restarts the dwell from zero rather than cutting the reader off mid-quote. */
  useEffect(() => {
    if (paused || CASES.length < 2) return;
    if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const id = globalThis.setInterval(
      () => setActive((i) => (i + 1) % CASES.length),
      CASE_DWELL_MS,
    );
    return () => globalThis.clearInterval(id);
  }, [paused, active]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.visibilityState !== "visible");
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /* A `tablist` is a single tab stop: Left/Right move between tabs, Home/End jump to the ends. */
  const onTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const next = {
      ArrowRight: (active + 1) % CASES.length,
      ArrowDown: (active + 1) % CASES.length,
      ArrowLeft: (active - 1 + CASES.length) % CASES.length,
      ArrowUp: (active - 1 + CASES.length) % CASES.length,
      Home: 0,
      End: CASES.length - 1,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setActive(next);
    document.getElementById(`case-tab-${next}`)?.focus();
  };

  return (
    <section
      id="results"
      className="border-b border-ru-n-100 bg-ink-25"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mx-auto max-w-280 px-5 py-14 sm:py-26">
        <div className="mx-auto mb-7 max-w-155 text-center sm:mb-11">
          <Eyebrow
            className="mb-4.5"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="M3 20h18" />
                <rect x="4.5" y="12" width="4" height="6" rx="1" />
                <rect x="10.5" y="8" width="4" height="10" rx="1" />
                <rect x="16.5" y="4" width="4" height="14" rx="1" />
              </svg>
            }
          >
            Case studies
          </Eyebrow>
          <h2 className="font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance text-ru-n-700">
            Real businesses, real growth.
          </h2>
        </div>

        {/* Two up on phones, four across from `lg`. `auto-fit` stacked all four into a single
            column below 440px — roughly 600px of tabs to scroll past before the panel they
            control — and gave a ragged 3 + 1 on iPad portrait. */}
        <div
          role="tablist"
          aria-label="Case studies"
          onKeyDown={onTabKeyDown}
          className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 lg:grid-cols-4"
        >
          {CASES.map((cs, i) => (
            <button
              key={cs.name}
              type="button"
              role="tab"
              id={`case-tab-${i}`}
              aria-selected={active === i}
              aria-controls="case-panel"
              tabIndex={active === i ? 0 : -1}
              onClick={() => setActive(i)}
              className={`relative min-w-0 cursor-pointer overflow-hidden rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-ru-blue-200 hover:shadow-md sm:p-6 ${
                active === i
                  ? "border-ru-blue-600 bg-ru-blue-50 shadow-md"
                  : "border-ru-n-200 bg-white shadow-sm"
              }`}
            >
              {/* Dwell timer for the active tab. Pausing clears the interval outright rather
                  than suspending it, so the bar unmounts too and both restart together on
                  resume — a bar left frozen mid-fill would promise a countdown that isn't
                  running, then jump when the full interval restarted underneath it. */}
              {active === i && !paused && (
                <span
                  key={active}
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-0.5 origin-left animate-ru-progress bg-ru-blue-600 motion-reduce:hidden"
                />
              )}
              <div className="font-display text-[clamp(2rem,4.4vw,2.875rem)]/none font-bold tracking-[-0.04em] text-ru-n-700">
                <CountUp value={cs.kpi} />
              </div>
              <div className="mt-2.5 text-[15px] text-ru-n-600">{cs.kpiLabel}</div>
              <div className="mt-3.5 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-ru-n-100 pt-3">
                <span className="text-[13.5px] text-ru-n-400">{cs.name}</span>
                <span className="inline-flex flex-none items-center gap-1.25 text-[13.5px] font-semibold text-ru-blue-600">
                  View
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Explicit columns, not `auto-fit`: a `minmax(300px, 1fr)` track cannot shrink below
            its 300px floor, so on any phone it overflowed the padded panel (272px of content
            at 360px wide) instead of dropping to one column. */}
        <div
          id="case-panel"
          role="tabpanel"
          aria-labelledby={`case-tab-${active}`}
          className="grid grid-cols-1 items-center gap-7 rounded-3xl border border-ru-n-200 bg-ru-n-50 p-6 sm:gap-12 sm:p-11 md:grid-cols-2"
        >
          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <img
                src={c.logo}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-9 rounded-lg border border-ru-n-200 bg-white object-contain p-0.5"
              />
              <span className="font-display text-[20.5px] font-bold tracking-[-0.03em] text-ru-n-700">
                {c.name}
              </span>
              <span className="rounded-full border border-ru-n-200 bg-white px-2.5 py-1 text-[12.5px] font-medium text-ru-n-500">
                {c.sector}
              </span>
            </div>

            <div className="mb-4 flex gap-0.75" aria-label="Rated 5 out of 5">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className="size-3.5 rounded-[2px] bg-ru-star" />
              ))}
            </div>

            <blockquote className="mb-5.5 font-display text-[clamp(1.25rem,2.7vw,1.6875rem)]/[1.42] font-medium tracking-[-0.022em] text-pretty text-ru-n-700">
              “{c.quote}”
            </blockquote>

            <div className="mb-5.5 flex items-center gap-2.75">
              <span className="flex size-9.5 flex-none items-center justify-center rounded-full bg-ru-blue-600 text-sm font-semibold text-white">
                {c.initials}
              </span>
              <div>
                <div className="text-[15px] font-medium text-ru-n-700">{c.who}</div>
                <div className="text-[13.5px] text-ru-n-400">{c.sector}</div>
              </div>
            </div>

            {/* Keyed on the case so the figures re-count on every switch, including when two
                cases happen to share a value. */}
            <div
              key={active}
              className="mb-5.5 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-px overflow-hidden rounded-xl border border-ru-n-200 bg-ru-n-200"
            >
              {c.stats.map((s) => (
                <div key={s.k} className="min-w-0 bg-white px-4 py-3.5">
                  <div className="mb-1.25 text-[12.5px] text-ru-n-400">{s.k}</div>
                  <div className="font-display text-[19.5px] font-bold tracking-[-0.02em] text-ru-n-700">
                    <CountUp value={s.v} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-3 text-[12.5px] font-semibold tracking-widest text-ru-n-400 uppercase">
              What we ran
            </div>
            <div className="flex flex-col gap-2.5">
              {c.steps.map((step) => (
                <div key={step} className="flex gap-2.75 text-[15.5px]/[1.55] text-ru-n-600">
                  <CheckIcon className="mt-1 size-4.25 flex-none text-ru-blue-600" />
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* The message the campaign actually sends, in a phone frame. */}
          <div className="flex min-w-0 justify-center">
            <div className="w-[min(100%,288px)] rounded-4xl bg-ru-blue-900 p-2.25 shadow-[0_24px_64px_rgba(16,24,40,0.1)]">
              <div className="overflow-hidden rounded-[28px] bg-white">
                <div className="flex items-center gap-2.5 border-b border-ru-n-200 bg-ru-n-50 px-4 py-3.5">
                  <span className="flex size-7.5 flex-none items-center justify-center rounded-full bg-ru-blue-600 text-[12.5px] font-semibold text-white">
                    {c.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-ru-n-700">{c.name}</div>
                    <div className="text-xs text-ru-n-400">Business account · online</div>
                  </div>
                  <WhatsAppTile className="size-5 rounded-[5px]" glyphClassName="size-3" />
                </div>

                <div className="flex flex-col gap-2.5 bg-white px-3.5 py-4">
                  <div className="max-w-[92%] self-start rounded-[16px_16px_16px_4px] border border-ru-n-200 bg-ru-n-50 p-2.5 text-sm/normal text-ru-n-600">
                    <div className="mb-2.5 flex h-24 items-center justify-center rounded-[10px] border border-ru-n-200 bg-[repeating-linear-gradient(135deg,var(--color-ru-n-100)_0_8px,#fff_8px_16px)]">
                      <span className="font-mono text-[11.5px] text-ru-n-400">
                        campaign creative
                      </span>
                    </div>
                    <div className="mb-1.25 font-semibold text-ru-n-700">{c.message.title}</div>
                    {c.message.body}
                    <div className="mt-2 text-[13px] text-ru-n-500">{c.message.note}</div>
                    <div className="mt-2 text-right text-[11.5px] text-ru-n-400">18:02</div>
                    <div className="-mx-2.5 -mb-2.5 mt-2.75 flex flex-col border-t border-ru-n-200">
                      <span className="flex items-center justify-center gap-1.75 p-2.75 text-[13.5px] font-semibold text-ru-blue-600">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="size-3.5"
                          aria-hidden="true"
                        >
                          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                          <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
                        </svg>
                        {c.message.cta}
                      </span>
                      <span className="flex items-center justify-center gap-1.75 border-t border-ru-n-200 p-2.75 text-[13.5px] font-semibold text-ru-blue-600">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="size-3.5"
                          aria-hidden="true"
                        >
                          <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
                        </svg>
                        {c.message.cta2}
                      </span>
                    </div>
                  </div>

                  <div className="max-w-[82%] self-end rounded-[16px_16px_4px_16px] bg-ru-blue-600 px-3.25 py-2.5 text-sm/normal text-white">
                    {c.message.cta}
                    <div className="mt-1 text-[11.5px] opacity-72">18:04 ✓✓</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

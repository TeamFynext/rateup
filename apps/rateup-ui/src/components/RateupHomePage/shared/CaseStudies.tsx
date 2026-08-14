import { useState, useEffect } from "react";

import { imagesPath } from "@/utils/constants";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
    <path d="M12 1.8l2.95 5.98 6.6.96-4.77 4.65 1.13 6.57L12 16.84 6.09 19.96l1.13-6.57L2.45 8.74l6.6-.96L12 1.8z" />
  </svg>
);

const Stars = () => (
  <div className={styles.csStars} aria-label="5 out of 5">
    {[...Array(5)].map((_, i) => (
      <StarIcon key={i} />
    ))}
  </div>
);

const bhima = `${imagesPath}/landing/logos/Bhima.png`;
const shopdoc = `${imagesPath}/landing/logos/shopdoc.png`;
const myg = `${imagesPath}/landing/logos/myg.jpg`;
const metromedical = `${imagesPath}/landing/logos/metromedical.png`;

// Custom coded mockups for the right side portion of each case study
function BhimaVisual() {
  return (
    <div className="w-full h-full flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-b from-[#7f1d1d] to-[#450a0a] text-white select-none">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-black/40 border border-[#A0721F] overflow-hidden">
          <img src={bhima} alt="Bhima Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <h4 className="font-black text-[15px] tracking-wide text-white uppercase leading-none mb-1">
            BHIMA Jewellery
          </h4>
          <p className="text-white/60 text-[10px] font-semibold leading-none">
            WhatsApp Campaigns + Loyalty
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-2xl text-slate-800 my-auto max-w-[340px] mx-auto w-full border border-slate-100/50 transform hover:scale-[1.02] transition-transform duration-300">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-amber-500">✨</span>
          <h5 className="font-extrabold text-sm text-red-800">Akshaya Tritiya Gold Offer</h5>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          Get <strong className="font-bold text-slate-900">5% off</strong> on all gold jewellery
          this week. Valid at all BHIMA stores.
        </p>
        <div className="flex gap-2">
          <button className="flex-1 py-2 px-3 text-center bg-[#7f1d1d] text-white rounded-xl text-xs font-extrabold hover:bg-red-900 transition-colors cursor-pointer border-0">
            Shop Now
          </button>
          <button className="flex-1 py-2 px-3 text-center bg-red-50/50 hover:bg-red-50 text-red-850 border border-solid border-red-100 rounded-xl text-xs font-extrabold transition-colors cursor-pointer">
            View Catalogue
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-solid border-white/10 pt-4 text-center">
        <div>
          <div className="text-2xl font-black text-[#ffd54c]">3.1×</div>
          <div className="text-[10px] text-white/50 uppercase font-bold tracking-wider">
            Campaign ROI
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-[#ffd54c]">98%</div>
          <div className="text-[10px] text-white/50 uppercase font-bold tracking-wider">
            Open Rate
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-[#ffd54c]">+44%</div>
          <div className="text-[10px] text-white/50 uppercase font-bold tracking-wider">
            Lead Conversion
          </div>
        </div>
      </div>
    </div>
  );
}

function ShopDocVisual() {
  return (
    <div className="w-full h-full flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-b from-[#0f766e] to-[#115e59] text-white select-none">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-cyan-500/20 border border-[#2a9d8f] overflow-hidden">
          <img src={shopdoc} alt="ShopDoc Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <h4 className="font-black text-[15px] tracking-wide text-white uppercase leading-none mb-1">
            ShopDoc
          </h4>
          <p className="text-white/60 text-[10px] font-semibold leading-none">
            Instant Feedback via WhatsApp
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-2xl text-slate-800 my-auto max-w-[340px] mx-auto w-full border border-slate-100/50 transform hover:scale-[1.02] transition-transform duration-300">
        <h5 className="font-extrabold text-sm text-slate-800 mb-3 text-center">
          How was your visit today?
        </h5>

        <div className="flex justify-between gap-1.5 mb-4">
          {[
            { icon: "😞", label: "Bad" },
            { icon: "😐", label: "Okay" },
            { icon: "🙂", label: "Good" },
            { icon: "😃", label: "Great" },
          ].map((item, idx) => (
            <button
              key={idx}
              className={`flex-1 py-2 flex flex-col items-center gap-1 rounded-xl transition-all border border-solid cursor-pointer ${
                idx === 3
                  ? "bg-cyan-50 border-cyan-300 scale-105 shadow-sm"
                  : "bg-slate-50/50 border-slate-100 hover:bg-slate-50"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span
                className={`text-[9px] font-bold ${idx === 3 ? "text-cyan-700" : "text-slate-400"}`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>

        <div className="py-2 text-center bg-cyan-600 text-white rounded-xl text-xs font-extrabold shadow-md shadow-cyan-600/20 cursor-pointer border-0">
          Submit Feedback
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-solid border-white/10 pt-4 text-center">
        <div>
          <div className="text-2xl font-black text-cyan-300">92%</div>
          <div className="text-[10px] text-white/50 uppercase font-bold tracking-wider">
            Open rate
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-cyan-300">+27</div>
          <div className="text-[10px] text-white/50 uppercase font-bold tracking-wider">
            NPS points
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-cyan-300">18h</div>
          <div className="text-[10px] text-white/50 uppercase font-bold tracking-wider">
            Faster resolution
          </div>
        </div>
      </div>
    </div>
  );
}

function MyGVisual() {
  return (
    <div className="w-full h-full flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-b from-[#111827] via-[#0f172a] to-[#1e1b4b] text-white select-none">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-orange-500/20 border border-orange-500 overflow-hidden">
          <img src={myg} alt="myG Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <h4 className="font-black text-[15px] tracking-wide text-white uppercase leading-none mb-1">
            myG Electronics
          </h4>
          <p className="text-white/60 text-[10px] font-semibold leading-none">
            WhatsApp Loyalty — No App Needed
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-5 shadow-2xl text-white my-auto max-w-[340px] mx-auto w-full relative overflow-hidden transform hover:scale-[1.02] transition-transform duration-300 border-0">
        <div className="absolute inset-0 bg-white/5 pointer-events-none" />
        <div className="text-white/80 text-[11px] uppercase tracking-wider mb-1 font-semibold">
          Your Rewards Balance
        </div>
        <div className="text-3xl font-black mb-4 flex items-baseline gap-1">
          380 <span className="text-sm font-medium text-white/80">pts</span>
        </div>

        <div className="w-full h-2 bg-white/20 rounded-full mb-2 overflow-hidden">
          <div className="w-[70%] h-full bg-white rounded-full shadow-inner" />
        </div>
        <div className="flex justify-between text-[10px] text-white/80 font-medium">
          <span>Silver Member</span>
          <span>124 pts to Gold →</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-solid border-white/10 pt-4 text-center">
        <div>
          <div className="text-2xl font-black text-amber-400">3×</div>
          <div className="text-[10px] text-white/50 uppercase font-bold tracking-wider">
            Repeat Purchases
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-amber-400">0</div>
          <div className="text-[10px] text-white/50 uppercase font-bold tracking-wider">
            Apps to Install
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-amber-400">+68%</div>
          <div className="text-[10px] text-white/50 uppercase font-bold tracking-wider">
            Loyalty Sign-ups
          </div>
        </div>
      </div>
    </div>
  );
}

function MetroMedicalsVisual() {
  return (
    <div className="w-full h-full flex flex-col justify-between p-6 sm:p-8 bg-[#061d33] text-white select-none">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#2A9D8F]/20 border border-red-700 overflow-hidden">
          <img
            src={metromedical}
            alt="Metro Medicals Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <h4 className="font-black text-[15px] tracking-wide text-white uppercase leading-none mb-1">
            Metro Medicals
          </h4>
          <p className="text-white/60 text-[10px] font-semibold leading-none">
            Lab Reports + Feedback via WhatsApp
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-2xl text-slate-800 my-auto max-w-[340px] mx-auto w-full border border-slate-100/50 transform hover:scale-[1.02] transition-transform duration-300">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-blue-500">📋</span>
          <h5 className="font-bold text-sm text-blue-900">Lab Report Ready</h5>
        </div>
        <div className="space-y-2 mb-4 border-0">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Haemoglobin</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center gap-1">
              14.2 <span className="text-[10px]">✓</span>
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Fasting Glucose</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-bold flex items-center gap-1">
              108 <span className="text-[10px]">⚠️</span>
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Platelet Count</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center gap-1">
              2.4L <span className="text-[10px]">✓</span>
            </span>
          </div>
        </div>
        <div className="py-2 text-center bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer border-0">
          <span>✓</span> Sent to patient via WhatsApp
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-solid border-white/10 pt-4 text-center">
        <div>
          <div className="text-2xl font-black text-cyan-400">94%</div>
          <div className="text-[10px] text-white/50 uppercase font-bold tracking-wider">
            Feedback Response
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-cyan-400">Zero</div>
          <div className="text-[10px] text-white/50 uppercase font-bold tracking-wider">
            Report Queues
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-cyan-400">+31</div>
          <div className="text-[10px] text-white/50 uppercase font-bold tracking-wider">
            Patient Sat. Score
          </div>
        </div>
      </div>
    </div>
  );
}

const cases = [
  {
    id: 0,
    logoText: "BJ",
    logoStyle: { background: "linear-gradient(135deg,#C8973A,#A0721F)" },
    company: "Bhima Jewellery",
    image: bhima,
    industry: "Jewellery Retail",
    kpi: "3.1×",
    kpiLabel: "campaign ROI",
    badge: "Jewellery Retail",
    heading: "Campaigns, leads and loyalty — all on WhatsApp",
    body: "Bhima Jewellery runs targeted WhatsApp marketing campaigns to the right customer segments, captures and follows up leads automatically, and rewards loyal buyers with a WhatsApp-native loyalty program — no app download needed.",
    metrics: [
      { value: "3.1×", label: "Campaign ROI" },
      { value: "+44%", label: "Lead conversion" },
      { value: "98%", label: "Message open rate" },
    ],
    quote:
      "RateUp turned WhatsApp into our most powerful sales channel — campaigns go out in minutes and leads never fall through the cracks.",
    cite: "— Bhima Jewellery",
  },
  {
    id: 1,
    logoText: "SD",
    logoStyle: { background: "linear-gradient(135deg,#4FC3FF,#2FA3FF)" },
    company: "ShopDoc",
    image: shopdoc,
    industry: "Healthcare",
    kpi: "92%",
    kpiLabel: "message open rate",
    badge: "Healthcare",
    heading: "Catching issues before they become bad reviews",
    body: "ShopDoc replaced email surveys with one-tap WhatsApp feedback fired the moment an order lands. Sentiment now reaches the team in real time, so problems get fixed long before they reach a public review.",
    metrics: [
      { value: "92%", label: "Open rate" },
      { value: "+27", label: "NPS points" },
      { value: "18h", label: "Faster resolution" },
    ],
    quote:
      "Our WhatsApp open rates beat email by a mile — we fix issues before they ever become a bad review.",
    cite: "— ShopDoc",
  },
  {
    id: 2,
    logoText: "MG",
    logoStyle: {
      background: "var(--warm-logo-gradient)",
      color: "#3a2400",
    },
    company: "myG",
    image: myg,
    industry: "Electronics Retail",
    kpi: "3×",
    kpiLabel: "repeat purchases",
    badge: "Electronics Retail",
    heading: "A loyalty program with zero app downloads",
    body: "myG launched points, tiers and rewards entirely inside WhatsApp — the channel customers already use daily. No new app, no sign-up forms, just a message. Redemptions and repeat visits climbed from week one.",
    metrics: [
      { value: "3×", label: "Repeat purchases" },
      { value: "41%", label: "Reward redemption" },
      { value: "0", label: "Apps to install" },
    ],
    quote:
      "Loyalty on WhatsApp meant zero friction for customers. It just works in the chat they already use.",
    cite: "— myG",
  },
  {
    id: 3,
    logoText: "MM",
    logoStyle: { background: "linear-gradient(135deg,#2A9D8F,#1A6B63)" },
    company: "Metro Medicals",
    image: metromedical,
    industry: "Healthcare",
    kpi: "94%",
    kpiLabel: "feedback response",
    badge: "Healthcare",
    heading: "From lab to patient — instantly on WhatsApp",
    body: "Metro Medicals collects post-visit feedback via WhatsApp and tracks sentiment in real time, delivers lab reports directly to patients' phones, and shares care instructions and appointment reminders — all automated, all in one platform.",
    metrics: [
      { value: "94%", label: "Feedback response rate" },
      { value: "Zero", label: "Report collection queues" },
      { value: "+31", label: "Patient satisfaction score" },
    ],
    quote:
      "Patients get their lab reports on WhatsApp within minutes — and the feedback we collect helps us improve care every single day.",
    cite: "— Metro Medicals",
  },
];

export default function CaseStudies() {
  const [active, setActive] = useState(0);
  const c = cases[active];

  useEffect(() => {
    const elements = document.querySelectorAll(`.${styles.reveal}`);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.in);
          }
        });
      },
      {
        threshold: 0.15,
      },
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section className={styles.section} id="cases">
      <div className={styles.page}>
        <div className={styles["sec-head"]}>
          <span className={`${styles.eyebrow} ${styles.reveal}`}>
            <span className={styles.dot} />
            Case Studies
          </span>

          <h2 className={styles.reveal} data-d="1">
            Real Businesses, <span className={styles["grad-cyan"]}>Real Growth</span>
          </h2>

          <p className={styles.reveal} data-d="2">
            See how teams across industries turned RateUp into measurable revenue and retention.
          </p>
        </div>

        <div className={`${styles.csShell} ${styles.reveal}`} data-d="1">
          <div className={styles.csRail} role="tablist" aria-label="Case studies">
            {cases.map((cs) => (
              <button
                key={cs.id}
                className={`${styles.csTab} ${active === cs.id ? styles.active : ""}`}
                role="tab"
                aria-selected={active === cs.id}
                onClick={() => setActive(cs.id)}
              >
                <span className={styles.csTabLogo} style={cs.logoStyle}>
                  <img
                    src={cs.image}
                    alt={cs.company}
                    className="w-full h-full object-contain border rounded-[10px]"
                  />
                </span>

                <span className={styles.csTabId}>
                  <b>{cs.company}</b>
                  <small>{cs.industry}</small>
                </span>

                <span className={styles.csTabKpi}>
                  {cs.kpi}
                  <em>{cs.kpiLabel}</em>
                </span>
              </button>
            ))}
          </div>

          <div className={styles.csStage}>
            <article className={`${styles.csPanel} ${styles.active}`} role="tabpanel">
              <div className={styles.csCopy}>
                <span className={styles.csBadge}>{c.badge}</span>

                <h3>{c.heading}</h3>

                <p>{c.body}</p>

                <div className={styles.csMetrics}>
                  {c.metrics.map((m, i) => (
                    <div key={i} className={styles.csMetric}>
                      <b className={i === 1 ? styles.warm : ""}>{m.value}</b>
                      <span>{m.label}</span>
                    </div>
                  ))}
                </div>

                <blockquote>
                  <Stars />
                  {c.quote}
                  <cite>{c.cite}</cite>
                </blockquote>
              </div>

              <div className={styles.csVisual} style={{ overflow: "hidden" }}>
                {c.id === 0 && <BhimaVisual />}
                {c.id === 1 && <ShopDocVisual />}
                {c.id === 2 && <MyGVisual />}
                {c.id === 3 && <MetroMedicalsVisual />}
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

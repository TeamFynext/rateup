import style from "./feedback.module.css";

const ChevronRight = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

const cards = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: "Retail & E-commerce",
    desc: "Understand post-purchase satisfaction, product feedback, and delivery experience. Reduce returns, catch issues early, and build lasting loyalty through automated post-order feedback flows.",
    delay: "1",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 11l18-5v12L3 14v-3z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </svg>
    ),
    title: "Restaurants & Hospitality",
    desc: "Collect feedback on food quality, service, and ambiance instantly after each visit. Boost online ratings on Google and TripAdvisor by prompting happy customers to share their experience.",
    delay: "2",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Service Providers",
    desc: "Gauge client satisfaction after appointments — salons, clinics, repairs, and more. Identify areas for improvement, encourage repeat visits, and turn satisfied customers into vocal advocates.",
    delay: "3",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    title: "SaaS & Software",
    desc: "Gather user feedback on features, onboarding, and support directly within the messaging apps they use. Capture NPS scores, CSAT, and churn signals before it's too late to act.",
    delay: "4",
  },
];

export default function BusinessSection() {
  return (
    <section className="bg-white py-16 md:py-[100px]" id="business">
      <div className="max-w-[1200px] mx-auto px-5 md:px-8">
        <div className={`text-center max-w-[760px] mx-auto ${style.reveal}`}>
          <h6 className="font-nunito font-extrabold text-[clamp(30px,4vw,50px)] tracking-[-0.025em] leading-[1.08] text-ink-800">
            Built for Businesses That Thrive
            <br />
            on Customer Happiness
          </h6>
          <p className="mt-4 text-[17px] leading-[1.55] text-ink-500">
            RateUp is perfect for any business that values customer feedback and
            wants a modern, effective way to collect it.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-[22px] mt-14 max-w-[960px] mx-auto max-lg:grid-cols-1 max-lg:max-w-[500px]">
          {cards.map((c) => (
            <div
              key={c.title}
              className={`border border-ink-100 rounded-[22px] p-8 bg-white shadow-[0_1px_2px_rgba(11,31,72,0.06),0_2px_6px_rgba(11,31,72,0.05)] hover:-translate-y-1 hover:shadow-[0_12px_48px_rgba(11,31,72,0.12)] transition-all ${style.reveal}`}
              data-d={c.delay}
            >
              <div className="w-[52px] h-[52px] rounded-2xl bg-[#EEF4FB] flex items-center justify-center mb-[18px]">
                <span className="w-[26px] h-[26px] text-fb-green flex items-center justify-center">
                  {c.icon}
                </span>
              </div>
              <h6 className="font-nunito font-extrabold text-[20px] text-ink-800 mb-2.5">
                {c.title}
              </h6>
              <p className="text-sm text-ink-500 leading-[1.55] mb-5">
                {c.desc}
              </p>
              <a
                href="#"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-fb-green no-underline [&_svg]:transition-transform hover:[&_svg]:translate-x-0.5"
              >
                Learn More <ChevronRight />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

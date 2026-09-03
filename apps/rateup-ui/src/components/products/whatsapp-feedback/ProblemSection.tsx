import style from "./feedback.module.css";

const XIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 14, height: 14 }}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const cards = [
  {
    icon: (color: string) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <polyline points="22 6 12 13 2 6" />
      </svg>
    ),
    title: "Email Surveys",
    desc: "Buried in inboxes, flagged as spam, and ignored. Open rates hover around 20% — and of those who open, almost nobody completes the survey.",
    badge: "2% response rate",
    delay: "1",
  },
  {
    icon: (color: string) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "SMS Surveys",
    desc: "Generic links feel impersonal and suspicious. Customers don't click unknown URLs from businesses, and those who do rarely finish a web form on mobile.",
    badge: "5% completion rate",
    delay: "2",
  },
  {
    icon: (color: string) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    title: "Phone Calls",
    desc: "Customers screen calls from unknown numbers. Cold calls interrupt their day, feel intrusive, and create a negative brand impression — the exact opposite of what you want.",
    badge: "Mostly unanswered",
    delay: "3",
  },
];

export default function ProblemSection() {
  return (
    <section className="bg-white py-16 md:py-[100px]">
      <div className="max-w-[1200px] mx-auto px-5 md:px-8">
        <div className={`text-center max-w-[760px] mx-auto ${style.reveal}`}>
          <h6 className="font-nunito font-extrabold text-[clamp(30px,4vw,50px)] tracking-[-0.025em] leading-[1.08] text-ink-800">
            Are You Losing Customers
            <br />
            Because You Can't Hear Them?
          </h6>
          <p className="mt-4 text-[17px] leading-[1.55] text-ink-500">
            Email surveys get lost in spam. SMS goes unread. Phone calls annoy. Relying on these
            outdated methods means you're missing critical feedback, operating blind, and
            potentially losing business to a dismal <strong>2% response rate</strong>.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-14 max-lg:grid-cols-1 max-lg:max-w-[400px] max-lg:mx-auto">
          {cards.map((c) => (
            <div
              key={c.title}
              className={`border border-ink-100 rounded-[22px] px-[26px] py-8 pb-7 text-center bg-white shadow-[0_1px_2px_rgba(11,31,72,0.06),0_2px_6px_rgba(11,31,72,0.05)] hover:-translate-y-1 hover:shadow-[0_1px_2px_rgba(11,31,72,0.06),0_8px_24px_rgba(11,31,72,0.06)] transition-all relative overflow-hidden ${style.reveal}`}
              data-d={c.delay}
            >
              <div className="relative w-[72px] h-[72px] mx-auto mb-[22px]">
                <div className="w-[72px] h-[72px] rounded-[20px] bg-ink-50 flex items-center justify-center">
                  <span className="w-8 h-8 text-ink-400 flex items-center justify-center">
                    {c.icon("currentColor")}
                  </span>
                </div>
                <div className="absolute left-[-5px] top-[50%] w-[calc(100%+10px)] h-[2.5px] bg-destructive rounded-[2px] -rotate-[35deg] -translate-y-1/2 opacity-75 pointer-events-none" />
              </div>
              <h6 className="font-nunito font-extrabold text-[20px] text-ink-800 mb-2.5">
                {c.title}
              </h6>
              <p className="text-sm text-ink-500 leading-[1.55] mb-5">{c.desc}</p>
              <div className="inline-flex items-center gap-1.5 bg-[#FFF0F0] text-red-600 font-extrabold text-sm py-1.5 px-3.5 rounded-full">
                <XIcon />
                {c.badge}
              </div>
            </div>
          ))}
        </div>

        <div className={`text-center mt-16 ${style.reveal}`}>
          <div className="inline-block text-[13px] font-bold text-ink-400 uppercase tracking-[0.08em] border border-ink-200 rounded-full py-1.5 px-[18px] mb-8">
            Meanwhile, your customers are on WhatsApp every day
          </div>
          <div className="flex items-start gap-4 md:gap-5 bg-[linear-gradient(135deg,#163A2D_0%,#1E4D3C_100%)] rounded-3xl px-5 md:px-9 py-6 md:py-8 max-w-[680px] mx-auto shadow-[0_24px_56px_rgba(14,36,24,0.30)]">
            <div className="w-[60px] h-[60px] flex-shrink-0 rounded-2xl bg-wa-green flex items-center justify-center">
              <svg className="w-9 h-9 fill-white" viewBox="0 0 24 24">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.09c-.25.7-1.44 1.33-1.99 1.41-.51.08-1.16.11-1.87-.12-.43-.14-.99-.32-1.7-.63-2.99-1.29-4.94-4.3-5.09-4.5-.15-.2-1.22-1.62-1.22-3.09 0-1.47.77-2.19 1.04-2.49.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.25.59.84 2.04.91 2.19.07.15.12.32.02.52-.1.2-.15.32-.3.49-.15.17-.31.39-.45.52-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.02 1.12.99 2.06 1.3 2.36 1.45.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.3.39-.25.66-.15.27.1 1.71.81 2 .96.3.15.49.22.56.35.07.12.07.72-.18 1.42z" />
              </svg>
            </div>
            <div>
              <h6 className="font-nunito font-extrabold text-[22px] text-white mb-1.5">
                No apps. No forms. Just feedback.
              </h6>
              <p className="text-[15px] text-white/70 mb-3.5 leading-[1.5]">
                2 billion people use WhatsApp daily. RateUp sends feedback requests directly into
                the app they already check 23 times a day — in a conversation they actually want to
                open.
              </p>
              <div className="flex gap-2 flex-wrap">
                <span className="bg-[rgba(37,211,102,0.15)] border border-[rgba(37,211,102,0.3)] rounded-full py-1 px-3 text-[13px] font-bold text-[#6CDEA4]">
                  98% open rate
                </span>
                <span className="bg-[rgba(37,211,102,0.15)] border border-[rgba(37,211,102,0.3)] rounded-full py-1 px-3 text-[13px] font-bold text-[#6CDEA4]">
                  35% response rate
                </span>
                <span className="bg-white/10 border border-white/15 rounded-full py-1 px-3 text-[13px] font-bold text-white">
                  2B+ users
                </span>
                <span className="bg-white/10 border border-white/15 rounded-full py-1 px-3 text-[13px] font-bold text-white">
                  No app download
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

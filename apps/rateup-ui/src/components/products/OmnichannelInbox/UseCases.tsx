const personas = [
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
    iconBg: "rgba(248,149,29,0.16)",
    iconColor: "#FFB638",
    title: "Ecommerce Brand",
    quote:
      '"We were missing order queries on Instagram every single day. Now every message is assigned to someone, and our response time dropped from 6 hours to under 20 minutes."',
    metricN: "6h → 20m",
    metricL: "Response time improvement",
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    iconBg: "rgba(47,163,255,0.14)",
    iconColor: "#4FC3FF",
    title: "Multi-location Retailer",
    quote:
      '"We have staff across three stores sharing one WhatsApp number. RateUp Inbox finally gives each of them their own login, with full visibility for the manager."',
    metricN: "3",
    metricL: "Stores, one shared inbox — full visibility",
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    iconBg: "rgba(79,195,255,0.14)",
    iconColor: "#6BD0FF",
    title: "D2C Brand with a Small Support Team",
    quote:
      '"Automations handle the first response and routing. My two-person team now manages double the volume without feeling overwhelmed."',
    metricN: "2×",
    metricL: "Volume handled, same team size",
  },
];

export default function UseCases() {
  return (
    <section id="cases" className="py-20">
      <div className="max-w-[1200px] mx-auto px-7">
        <div className="text-center max-w-[720px] mx-auto mb-[52px]">
          <span
            className="reveal inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] px-[15px] py-[7px] rounded-full mb-5"
            style={{
              color: "#4FC3FF",
              background: "rgba(47,163,255,0.10)",
              border: "1px solid rgba(47,163,255,0.22)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#4FC3FF", boxShadow: "0 0 10px #4FC3FF" }}
            />
            Built for growing teams
          </span>
          <h6
            className="reveal d1 font-display font-black text-white leading-[1.06] tracking-[-0.025em] mt-5"
            style={{ fontSize: "clamp(32px,4.2vw,54px)" }}
          >
            Whether you're a team of 3 or 30
          </h6>
        </div>

        <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
          {personas.map(
            (
              { icon, iconBg, iconColor, title, quote, metricN, metricL },
              i,
            ) => (
              <div
                key={title}
                className={`reveal ${i > 0 ? `d${i}` : ""} flex flex-col p-7 rounded-[28px] transition-all duration-300 hover:-translate-y-1`}
                style={{
                  background:
                    "linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
              >
                <div
                  className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center mb-[18px] flex-shrink-0"
                  style={{ background: iconBg, color: iconColor }}
                >
                  {icon}
                </div>
                <h6 className="font-display font-black text-white text-[16px] mb-3.5 tracking-[-0.01em]">
                  {title}
                </h6>
                <blockquote className="text-[14px] leading-[1.62] text-white/75 m-0 italic flex-1">
                  {quote}
                </blockquote>
                <div
                  className="flex items-center gap-2.5 mt-5 pt-[18px]"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.09)" }}
                >
                  <span
                    className="font-display font-black text-[24px] leading-none tracking-[-0.02em]"
                    style={{ color: "#4FC3FF" }}
                  >
                    {metricN}
                  </span>
                  <span className="text-[11.5px] text-white/50 leading-[1.35]">
                    {metricL}
                  </span>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

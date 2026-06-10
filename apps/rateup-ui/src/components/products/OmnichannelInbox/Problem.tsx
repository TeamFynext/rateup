export default function Problem() {
  return (
    <section id="problem" className="py-20">
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
            Sound familiar?
          </span>
          <h2
            className="reveal d1 font-display font-black text-white leading-[1.06] tracking-[-0.025em] mt-5 mb-4"
            style={{ fontSize: "clamp(32px,4.2vw,54px)" }}
          >
            Your team is everywhere.
            <br />
            Your customers feel it.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3">
          {[
            {
              icon: (
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2z" />
                </svg>
              ),
              iconBg: "rgba(37,211,102,0.13)",
              iconColor: "#4AE88A",
              title: "Missed on WhatsApp",
              body: "A customer asked about their order three days ago. It's buried under 200 other chats. They've already moved on — and you never knew.",
              border: false,
            },
            {
              icon: (
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5.5" />
                  <circle cx="12" cy="12" r="4.2" />
                  <circle
                    cx="17.6"
                    cy="6.4"
                    r="1.3"
                    fill="currentColor"
                    stroke="none"
                  />
                </svg>
              ),
              iconBg: "rgba(221,42,123,0.13)",
              iconColor: "#F472B6",
              title: "Lost on Instagram",
              body: "Your DMs are full of buying intent — questions, complaints, compliments. No one has time to get to them all, and the algorithm doesn't wait.",
              border: true,
            },
            {
              icon: (
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              ),
              iconBg: "rgba(248,149,29,0.14)",
              iconColor: "#FFB638",
              title: "No visibility across teams",
              body: "Who replied? Who's handling it? Is it resolved? Nobody knows — and duplicated replies are embarrassing for your brand.",
              border: true,
            },
          ].map(({ icon, iconBg, iconColor, title, body, border }, i) => (
            <div
              key={title}
              className={`reveal px-7 ${border ? "md:border-l border-t md:border-t-0 pt-8 md:pt-0" : ""}`}
              style={{ borderColor: "rgba(255,255,255,0.09)" }}
              data-d={i > 0 ? String(i) : undefined}
            >
              <div
                className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center mb-5"
                style={{ background: iconBg, color: iconColor }}
              >
                {icon}
              </div>
              <h3 className="font-display font-black text-white text-[18px] leading-[1.25] mb-2.5 tracking-[-0.01em]">
                {title}
              </h3>
              <p className="text-[14px] leading-[1.58] text-white/50 m-0">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

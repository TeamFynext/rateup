const integrations = [
  {
    name: "WhatsApp Business",
    desc: "Official API with 98% open rates",
    bg: "#25D366",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.04c-.24.68-1.2 1.26-1.97 1.42-.53.11-1.22.2-3.56-.76-2.99-1.24-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2.01.89 2.16.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.4-.45.53-.15.15-.3.31-.13.6.17.3.77 1.27 1.65 2.06 1.14 1.01 2.09 1.33 2.39 1.48.3.15.47.13.64-.08.17-.2.74-.86.94-1.16.2-.3.4-.25.66-.15.27.1 1.7.8 1.99.95.3.15.49.22.56.35.07.13.07.73-.17 1.41z" />
      </svg>
    ),
  },
  {
    name: "Instagram DMs",
    desc: "Reply to DMs and story replies",
    bg: "linear-gradient(45deg,#F58529,#DD2A7B 55%,#8134AF)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
        <rect x="2" y="2" width="20" height="20" rx="5.5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.6" cy="6.4" r="1.1" fill="#fff" stroke="none" />
      </svg>
    ),
  },
  {
    name: "Messenger",
    desc: "Facebook Messenger in your inbox",
    bg: "linear-gradient(135deg,#00B2FF,#006AFF)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
        <path d="M12 2C6.27 2 2 6.2 2 11.7c0 2.9 1.2 5.4 3.14 7.13.16.14.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.98-.87c.17-.08.36-.09.54-.04 1.02.28 2.1.43 3.2.43 5.73 0 10-4.2 10-9.7S17.73 2 12 2z" />
      </svg>
    ),
  },
  {
    name: "Shopify",
    desc: "Pull live orders and customer data",
    bg: "#96BF48",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
  {
    name: "WooCommerce",
    desc: "Sync orders from your WordPress store",
    bg: "#7F54B3",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32" />
      </svg>
    ),
  },
  {
    name: "Zapier",
    desc: "Automate with 5,000+ apps",
    bg: "#FF4A00",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    name: "Webhooks & API",
    desc: "Connect any platform with REST API",
    bg: "rgba(47,163,255,0.12)",
    border: "1px solid rgba(47,163,255,0.28)",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#4FC3FF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    name: "More Coming",
    desc: "New integrations added every month",
    bg: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(255,255,255,0.50)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
];

export default function Integrations() {
  return (
    <section id="integrations" className="py-20">
      <div className="max-w-[1200px] mx-auto px-7">
        <div className="text-center max-w-[720px] mx-auto mb-[52px]">
          <span
            className=" inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] px-[15px] py-[7px] rounded-full mb-5"
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
            Integrations
          </span>
          <h6
            className="reveal d1 font-display font-black text-white leading-[1.06] tracking-[-0.025em] mt-5 mb-4"
            style={{ fontSize: "clamp(32px,4.2vw,54px)" }}
          >
            Connects with the tools
            <br />
            <span
              className="
  bg-[linear-gradient(100deg,#6BD0FF_0%,#2FA3FF_55%,#2C6FD6_100%)]
  bg-clip-text
  text-transparent
"
            >
              you already use.
            </span>
          </h6>
          <p className="reveal d2 text-[17px] leading-[1.65] text-white/50 m-0 max-w-[560px] mx-auto">
            RateUp Inbox plugs into your existing stack in minutes — no custom code, no API
            headaches.
          </p>
        </div>

        <div className="grid gap-3.5 grid-cols-2 md:grid-cols-4">
          {integrations.map(({ name, desc, bg, border, icon }, i) => (
            <div
              key={name}
              className={`reveal ${i % 4 === 1 ? "d1" : i % 4 === 2 ? "d2" : i % 4 === 3 ? "d3" : ""} flex flex-col items-center text-center gap-2.5 py-[22px] px-4 rounded-[20px] transition-all duration-300 hover:-translate-y-1`}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: border || "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <div
                className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center flex-shrink-0"
                style={{ background: bg, border: border }}
              >
                {icon}
              </div>
              <div className="text-[12.5px] font-bold text-white">{name}</div>
              <div className="text-[11px] text-white/35 leading-[1.48]">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { IgIcon, MsgrIcon, WaIcon } from "./icons";

export default function ProductIntro() {
  return (
    <section id="product" className="py-20">
      <div className="max-w-[1200px] mx-auto px-7">
        <div
          className="reveal rounded-[28px] p-8 md:p-16 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-[60px] items-center"
          style={{
            background: "linear-gradient(135deg,#0A2040 0%,#071528 100%)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          <div>
            <span
              className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] px-[15px] py-[7px] rounded-full mb-0"
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
              Meet RateUp Inbox
            </span>
            <h2
              className="font-display font-black text-white leading-[1.1] tracking-[-0.025em] mt-[18px] mb-[18px]"
              style={{ fontSize: "clamp(28px,3.2vw,44px)" }}
            >
              One inbox. Every channel. Your whole team.
            </h2>
            <p className="text-[15.5px] leading-[1.7] text-white/75 m-0 max-w-[440px]">
              RateUp Inbox brings your WhatsApp Business, Instagram DMs, and Messenger conversations
              into a single, organised workspace. Assign conversations, set roles, automate
              responses, and never let a customer message fall through the cracks — all from one
              screen.
            </p>
          </div>

          <div className="flex flex-col gap-3.5">
            {[
              {
                icon: <WaIcon size={22} />,
                iconBg: "#25D366",
                name: "WhatsApp Business",
                desc: "Full API integration, all message types",
                statN: "98%",
                statL: "Open rate",
                statColor: "#4FC3FF",
              },
              {
                icon: (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5.5" />
                    <circle cx="12" cy="12" r="4.2" />
                    <circle cx="17.6" cy="6.4" r="1.3" fill="#fff" stroke="none" />
                  </svg>
                ),
                iconBg: "linear-gradient(45deg,#F58529,#DD2A7B 55%,#8134AF)",
                name: "Instagram Direct",
                desc: "DMs, story replies, mentions",
                statN: "4×",
                statL: "Buying intent msgs",
                statColor: "#FFB638",
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                    <path d="M12 2C6.27 2 2 6.2 2 11.7c0 2.9 1.2 5.4 3.14 7.13.16.14.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.98-.87c.17-.08.36-.09.54-.04C8.1 21.86 9.18 22 10.28 22c5.73 0 10-4.2 10-9.7S17.73 2 12 2zm6 7.46l-2.93 4.65c-.47.74-1.46.93-2.17.4l-2.33-1.74a.6.6 0 0 0-.72 0l-3.15 2.39c-.42.32-.97-.18-.68-.62l2.93-4.65c.47-.74 1.46-.93 2.17-.4l2.33 1.74c.21.16.5.16.72 0l3.15-2.39c.42-.32.97.18.68.62z" />
                  </svg>
                ),
                iconBg: "linear-gradient(135deg,#00B2FF,#006AFF)",
                name: "Facebook Messenger",
                desc: "Full conversation threads",
                statN: "1",
                statL: "Unified inbox",
                statColor: "#4FC3FF",
              },
            ].map(({ icon, iconBg, name, desc, statN, statL, statColor }) => (
              <div
                key={name}
                className="flex items-center gap-3.5 p-4 rounded-[14px] transition-all duration-300 hover:translate-x-2"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
                  style={{
                    background: iconBg,
                    boxShadow: "0 8px 20px rgba(0,0,0,0.32),inset 0 1px 0 rgba(255,255,255,0.2)",
                  }}
                >
                  {icon}
                </div>
                <div>
                  <div className="font-display font-bold text-white text-[14.5px]">{name}</div>
                  <div className="text-[12px] text-white/50 mt-0.5">{desc}</div>
                </div>
                <div className="ml-auto text-right">
                  <div
                    className="font-display font-black text-[18px] leading-none tracking-[-0.01em]"
                    style={{ color: statColor }}
                  >
                    {statN}
                  </div>
                  <div className="text-[10.5px] text-white/35 mt-0.5">{statL}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// suppress unused import warning
export const i = IgIcon;
export const m = MsgrIcon;

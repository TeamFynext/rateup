import { useEffect, useRef } from "react";

import { useNavigate } from "@tanstack/react-router";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal";

import { ArrowRight, IgIcon, MsgrIcon, StarIcon, WaIcon } from "./icons";
import style from "./omnichannel.module.css";

interface Props {
  onAccess: () => void;
}

const agentReplies = [
  "Hi Sarah! Let me look up order #8823 for you right now.",
  "Found it — your order shipped this morning, tracking #TR-44821.",
  "It's estimated to arrive by 6 PM today. I'll send a tracking link now!",
];
const customerReplies = [
  "Oh wonderful, thank you so much! Really appreciate it.",
  "That's great news — I'll keep an eye out for the delivery.",
];
const newConvs = [
  {
    av: "MW",
    name: "Mark Wilson",
    prev: "Is this size true to fit?",
    color: "#1D5C8B",
    ch: "wa",
  },
  {
    av: "HS",
    name: "Hannah Scott",
    prev: "Order arrived, love it!",
    color: "#7C3AED",
    ch: "ig",
  },
  {
    av: "RP",
    name: "Ryan Phillips",
    prev: "Refund query order #7731",
    color: "#C2394A",
    ch: "ms",
  },
  {
    av: "GK",
    name: "Grace Kim",
    prev: "Do you have this in black?",
    color: "#065F46",
    ch: "wa",
  },
];

function ChipPip({ ch }: { ch: string }) {
  if (ch === "wa")
    return (
      <span
        className="absolute -bottom-0.5 -right-0.5 w-[11px] h-[11px] rounded-full border-[1.5px] border-white"
        style={{ background: "#25D366" }}
      />
    );
  if (ch === "ig")
    return (
      <span
        className="absolute -bottom-0.5 -right-0.5 w-[11px] h-[11px] rounded-full border-[1.5px] border-white"
        style={{ background: "linear-gradient(45deg,#F58529,#DD2A7B)" }}
      />
    );
  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 w-[11px] h-[11px] rounded-full border-[1.5px] border-white"
      style={{ background: "linear-gradient(135deg,#00B2FF,#006AFF)" }}
    />
  );
}

function ChipBadge({ ch }: { ch: string }) {
  if (ch === "wa")
    return (
      <span
        className="text-[7.5px] font-bold px-1 py-0.5 rounded text-white"
        style={{ background: "#25D366" }}
      >
        WHATSAPP
      </span>
    );
  if (ch === "ig")
    return (
      <span
        className="text-[7.5px] font-bold px-1 py-0.5 rounded text-white"
        style={{
          background: "linear-gradient(45deg,#F58529,#DD2A7B 55%,#8134AF)",
        }}
      >
        INSTAGRAM
      </span>
    );
  return (
    <span
      className="text-[7.5px] font-bold px-1 py-0.5 rounded text-white"
      style={{ background: "linear-gradient(135deg,#00B2FF,#006AFF)" }}
    >
      MESSENGER
    </span>
  );
}

export default function Hero({ onAccess }: Props) {
  const navigate = useNavigate();
  const msgsRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<HTMLDivElement>(null);
  const clistRef = useRef<HTMLDivElement>(null);
  const aIdx = useRef(0),
    cIdx = useRef(0),
    convIdx = useRef(0);

  useEffect(() => {
    const msgsEl = msgsRef.current;
    const typingEl = typingRef.current;
    const clistEl = clistRef.current;
    if (!msgsEl || !typingEl || !clistEl) return;

    const showTyping = (v: boolean) => {
      typingEl.style.opacity = v ? "1" : "0";
      typingEl.style.pointerEvents = v ? "" : "none";
    };

    const nowStr = () => {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };

    const addMsg = (text: string, isAgent: boolean) => {
      const wraps = msgsEl.querySelectorAll(".rp-msg-wrap");
      if (wraps.length >= 5) wraps[0].remove();
      const el = document.createElement("div");
      el.className = `rp-msg-wrap ${style.rpAnimMsg} flex items-end gap-1.5`;
      const avBg = isAgent ? "#2563EB" : "#4B5563";
      const avTxt = isAgent ? "SH" : "SC";
      const msgStyle = isAgent
        ? "background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;"
        : "background:#fff;border:1px solid #E5E7EB;color:#374151;";
      el.innerHTML = `
        <div style="width:20px;height:20px;border-radius:50%;background:${avBg};display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;color:#fff;flex-shrink:0;">${avTxt}</div>
        <div>
          <div style="${msgStyle}border-radius:10px 10px 10px 2px;padding:6px 9px;font-size:10px;line-height:1.5;">${text}</div>
          <div style="font-size:7.5px;color:#9CA3AF;margin-top:2px;">${nowStr()}</div>
        </div>`;
      msgsEl.insertBefore(el, typingEl);
    };

    const addNewConv = () => {
      const d = newConvs[convIdx.current % newConvs.length];
      convIdx.current++;
      const el = document.createElement("div");
      el.className =
        "rp-anim-conv flex items-start gap-2 px-2.5 py-2 border-b cursor-pointer hover:bg-gray-50";
      el.style.borderColor = "#F3F4F6";
      el.innerHTML = `
        <div style="width:30px;height:30px;border-radius:50%;background:${d.color};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0;position:relative;">
          ${d.av}
          <span style="position:absolute;bottom:-1px;right:-1px;width:11px;height:11px;border-radius:50%;border:1.5px solid #fff;background:${d.ch === "wa" ? "#25D366" : d.ch === "ig" ? "linear-gradient(45deg,#F58529,#DD2A7B)" : "linear-gradient(135deg,#00B2FF,#006AFF)"};"></span>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:3px;">
            <span style="font-size:10.5px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.name}</span>
            <span style="font-size:8.5px;color:#9CA3AF;white-space:nowrap;flex-shrink:0;">now</span>
          </div>
          <div style="font-size:9.5px;color:#6B7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;">${d.prev}</div>
        </div>
        <div style="position:absolute;top:12px;right:9px;width:7px;height:7px;border-radius:50%;background:#4FC3FF;box-shadow:0 0 7px rgba(79,195,255,0.8);"></div>`;
      el.style.position = "relative";
      const active = clistEl.querySelector(".rp-ci-on");
      clistEl.insertBefore(
        el,
        active ? active.nextSibling : clistEl.firstChild,
      );
      const all = clistEl.querySelectorAll('[class*="rp-"]');
      if (all.length > 7) all[all.length - 1].remove();
    };

    const steps = [
      () => {
        showTyping(true);
        return 2000;
      },
      () => {
        showTyping(false);
        addMsg(agentReplies[aIdx.current++ % agentReplies.length], true);
        return 2600;
      },
      () => {
        showTyping(true);
        return 1800;
      },
      () => {
        showTyping(false);
        addMsg(customerReplies[cIdx.current++ % customerReplies.length], false);
        return 2200;
      },
      () => {
        addNewConv();
        return 1800;
      },
      () => 1200,
    ];
    let step = 0;
    let tid: ReturnType<typeof setTimeout>;
    const tick = () => {
      const delay = steps[step]();
      step = (step + 1) % steps.length;
      tid = setTimeout(tick, delay);
    };
    showTyping(true);
    tid = setTimeout(tick, 1600);
    return () => clearTimeout(tid);
  }, []);

  return (
    <header
      id="top"
      className="relative overflow-hidden"
      style={{ padding: "72px 0 80px" }}
    >
      {/* bg glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 75% 35%,rgba(47,163,255,0.20),transparent 62%),radial-gradient(ellipse 45% 40% at 12% 18%,rgba(44,111,214,0.22),transparent 60%),radial-gradient(ellipse 70% 60% at 50% 110%,rgba(16,50,120,0.40),transparent 70%)",
        }}
      />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-7 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* LEFT */}
          <div className="reveal in">
            <div
              className="inline-flex items-center gap-2 px-3 py-[7px] rounded-full mb-6 text-[13px] font-medium text-white/75"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <span
                className="inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-[3px] rounded-full"
                style={{
                  background: "rgba(47,163,255,0.14)",
                  color: "#4FC3FF",
                }}
              >
                <span
                  className="w-[5px] h-[5px] rounded-full"
                  style={{
                    background: "#4FC3FF",
                    boxShadow: "0 0 8px #4FC3FF",
                  }}
                />
                New
              </span>
              Introducing RateUp Inbox
            </div>

            <h1
              className="font-display font-black text-white leading-[1.04] tracking-[-0.03em] mb-[18px]"
              style={{ fontSize: "clamp(30px,3.9vw,54px)" }}
            >
              Every customer conversation.
              <br />
              <span
                className="
  bg-[linear-gradient(100deg,#6BD0FF_0%,#2FA3FF_55%,#2C6FD6_100%)]
  bg-clip-text
  text-transparent
"
              >
                One powerful Inbox.
              </span>
            </h1>

            <p
              className="text-white/75 leading-[1.68] mb-8 max-w-[480px]"
              style={{ fontSize: "16.5px" }}
            >
              WhatsApp. Instagram. Messenger. All your customer messages flow
              into one unified workspace — so your team stops juggling tabs and
              starts building relationships.
            </p>

            <div className="flex gap-3.5 flex-wrap mb-9">
              <button
                onClick={() => navigate({ to: "/signup" })}
                className="inline-flex items-center gap-2 font-bold text-[15px] text-white px-6 py-3.5 rounded-[11px] transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(180deg,#3D8BEE,#2360C8)",
                  boxShadow:
                    "0 10px 30px rgba(45,111,214,0.45),inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              >
                Sign Up for Free <ArrowRight />
              </button>
              <BookDemoModal>
                <button
                  className="inline-flex items-center gap-2 font-bold text-[15px] text-white px-6 py-3.5 rounded-[11px] transition-all duration-200 hover:-translate-y-0.5 no-underline"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  Book a Demo
                </button>
              </BookDemoModal>
            </div>

            <div className="flex items-center gap-3.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/35">
                Works with
              </span>
              <div className="flex gap-2 flex-wrap">
                {[
                  {
                    icon: <WaIcon />,
                    label: "WhatsApp Business",
                    bg: "#25D366",
                  },
                  {
                    icon: <IgIcon />,
                    label: "Instagram DMs",
                    bg: "linear-gradient(45deg,#F58529,#DD2A7B 55%,#8134AF)",
                  },
                  {
                    icon: <MsgrIcon />,
                    label: "Messenger",
                    bg: "linear-gradient(135deg,#00B2FF,#006AFF)",
                  },
                ].map(({ icon, label, bg }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-full text-[12.5px] font-semibold text-white/75 transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.045)",
                      border: "1px solid rgba(255,255,255,0.09)",
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded-[6px] flex items-center justify-center flex-shrink-0"
                      style={{ background: bg }}
                    >
                      {icon}
                    </span>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: inbox mockup */}
          <div
            className="reveal in"
            style={{ "--d": "1" } as React.CSSProperties}
          >
            <div className="relative flex justify-center">
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle,rgba(47,163,255,0.20),transparent 70%)",
                }}
              />
              <div
                className="relative z-10 w-full rounded-[18px] overflow-hidden flex flex-row"
                style={{
                  maxWidth: "570px",
                  height: "360px",
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.07)",
                  boxShadow:
                    "0 16px 48px rgba(0,0,0,0.18),0 0 0 1px rgba(0,0,0,0.05)",
                }}
              >
                {/* Icon Rail */}
                <div
                  className="flex flex-col items-center pt-3 pb-2.5 gap-0.5 flex-shrink-0"
                  style={{ width: "46px", background: "#0D1F3C" }}
                >
                  <div className="mb-2.5">
                    <StarIcon size={22} />
                  </div>
                  {[
                    <svg
                      key="0"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>,
                    <svg
                      key="1"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 20V10M12 20V4M6 20v-6" />
                    </svg>,
                    <svg
                      key="2"
                      width="15"
                      height="15"
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
                    </svg>,
                    <svg
                      key="3"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>,
                  ].map((icon, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer ${i === 0 ? "bg-white/12 text-white/90" : "text-white/36"}`}
                    >
                      {icon}
                    </div>
                  ))}
                  <div className="flex-1" />
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white/36 cursor-pointer relative">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                    </svg>
                    <span className="absolute top-[3px] right-[3px] w-[13px] h-[13px] rounded-full bg-gray-500 text-[7px] font-black text-white flex items-center justify-center">
                      12
                    </span>
                  </div>
                </div>

                {/* Main panel */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                  {/* Topbar */}
                  <div
                    className="flex items-center gap-2 px-3 py-2 border-b flex-shrink-0"
                    style={{ background: "#fff", borderColor: "#E5E7EB" }}
                  >
                    <span
                      className="text-[12px] font-bold text-gray-900 flex items-center gap-1.5 flex-1"
                      style={{ fontFamily: "Nunito, sans-serif" }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      Inbox
                    </span>
                    <div className="flex items-center gap-1">
                      <span
                        className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: "rgba(29,78,216,0.1)",
                          color: "#1D4ED8",
                        }}
                      >
                        0
                      </span>
                      {[
                        "M12 5v14M5 12l7 7 7-7",
                        "M21 21l-4.35-4.35M11 11a8 8 0 1 0 16 0 8 8 0 0 0-16 0",
                        "M22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3",
                        "M23 4 23 10 17 10 M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
                      ].map((d, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 cursor-pointer"
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            {i === 1 ? (
                              <>
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                              </>
                            ) : (
                              <path d={d} />
                            )}
                          </svg>
                        </div>
                      ))}
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white ml-1"
                        style={{ background: "#4B5563" }}
                      >
                        SP
                      </div>
                    </div>
                  </div>

                  {/* Panels */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Nav sidebar */}
                    <div
                      className={`${style["inbox-nav-sidebar"]} flex flex-col overflow-hidden flex-shrink-0`}
                      style={{
                        width: "118px",
                        background: "#F8FAFC",
                        borderRight: "1px solid #E5E7EB",
                      }}
                    >
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-2 border-b text-[12px] font-bold text-gray-900"
                        style={{
                          borderColor: "#E5E7EB",
                          fontFamily: "Nunito, sans-serif",
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        Inbox
                      </div>
                      {[
                        { label: "New", badge: "7", active: true },
                        { label: "Assigned", badge: "2", active: false },
                        { label: "Mine", badge: "1", active: false },
                        { label: "Closed", badge: "", active: false },
                        { label: "All", badge: "", active: false },
                      ].map(({ label, badge, active }) => (
                        <div
                          key={label}
                          className="flex items-center gap-1.5 px-2.5 py-[5px] text-[10.5px] font-medium cursor-pointer relative"
                          style={{
                            background: active ? "#EFF6FF" : "transparent",
                            color: active ? "#1D4ED8" : "#4B5563",
                            fontWeight: active ? 600 : 500,
                          }}
                        >
                          {active && (
                            <span className="absolute left-0 top-0 bottom-0 w-[2.5px] rounded-r bg-blue-600" />
                          )}
                          {label}
                          {badge && (
                            <span
                              className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                              style={{
                                background: active ? "#1D4ED8" : "#6B7280",
                              }}
                            >
                              {badge}
                            </span>
                          )}
                        </div>
                      ))}
                      <div className="text-[8px] font-bold uppercase tracking-[0.09em] text-gray-400 px-2.5 py-1 mt-1">
                        Lifecycle Stages
                      </div>
                      {["New Lead·2", "Hot Lead·2", "Closed·2"].map((s) => {
                        const [label, n] = s.split("·");
                        return (
                          <div
                            key={label}
                            className="flex items-center gap-1 px-2.5 py-[3px] text-[10px] text-gray-500"
                          >
                            <span className="flex-1">{label}</span>
                            <span className="text-[9px] text-gray-400">
                              {n}
                            </span>
                          </div>
                        );
                      })}
                      <div className="text-[8px] font-bold uppercase tracking-[0.09em] text-gray-400 px-2.5 py-1">
                        Labels
                      </div>
                      <div className="text-[8px] font-bold uppercase tracking-[0.09em] text-gray-400 px-2.5 py-1">
                        Teams
                      </div>
                    </div>

                    {/* Conversation list */}
                    <div
                      ref={clistRef}
                      className={`${style["inbox-clist"]} flex flex-col overflow-hidden flex-shrink-0`}
                      style={{
                        width: "183px",
                        background: "#fff",
                        borderRight: "1px solid #E5E7EB",
                      }}
                    >
                      {[
                        {
                          av: "SC",
                          name: "Sarah Collins",
                          prev: "Interactive Message",
                          time: "Just now",
                          color: "#4B5563",
                          ch: "wa" as const,
                          active: true,
                        },
                        {
                          av: "JM",
                          name: "James Mitchell",
                          prev: "Interactive Message",
                          time: "2 hrs ago",
                          color: "#475569",
                          ch: "wa" as const,
                          active: false,
                        },
                        {
                          av: "EP",
                          name: "Emily Parker",
                          prev: "Loved the collection!",
                          time: "3 hrs ago",
                          color: "#64748B",
                          ch: "ig" as const,
                          active: false,
                        },
                        {
                          av: "DC",
                          name: "David Chen",
                          prev: "Interactive Message",
                          time: "4 hrs ago",
                          color: "#374151",
                          ch: "wa" as const,
                          active: false,
                        },
                      ].map(({ av, name, prev, time, color, ch, active }) => (
                        <div
                          key={name}
                          className="rp-ci-on flex items-start gap-2 px-2.5 py-2 border-b cursor-pointer relative"
                          style={{
                            borderColor: "#F3F4F6",
                            background: active ? "#EFF6FF" : undefined,
                            borderLeft: active
                              ? "3px solid #2563EB"
                              : undefined,
                          }}
                        >
                          <div className="relative flex-shrink-0">
                            <div
                              className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                              style={{
                                background: color,
                                fontFamily: "Nunito,sans-serif",
                              }}
                            >
                              {av}
                              <ChipPip ch={ch} />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-1">
                              <span className="text-[10.5px] font-semibold text-gray-900 truncate">
                                {name}
                              </span>
                              <span className="text-[8.5px] text-gray-400 flex-shrink-0">
                                {time}
                              </span>
                            </div>
                            <div className="text-[9.5px] text-gray-500 truncate mt-0.5">
                              {prev}
                            </div>
                            <div className="flex gap-1 mt-[3px]">
                              <ChipBadge ch={ch} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Thread */}
                    <div
                      className={`${style["rp-thread-panel"]} flex-1 flex flex-col min-w-0 overflow-hidden`}
                      style={{ background: "#F3F4F6" }}
                    >
                      <div
                        className="flex items-center gap-2 px-3 py-[7px] border-b flex-shrink-0"
                        style={{ background: "#fff", borderColor: "#E5E7EB" }}
                      >
                        <div className="relative flex-shrink-0">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{
                              background: "#4B5563",
                              fontFamily: "Nunito,sans-serif",
                            }}
                          >
                            SC
                            <span className="absolute bottom-0 right-0 w-[7px] h-[7px] rounded-full bg-green-500 border-[1.5px] border-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-gray-900">
                            Sarah Collins
                          </div>
                          <div className="text-[9px] text-green-500 font-medium">
                            ● Online
                          </div>
                        </div>
                        <span className="text-[8px] font-bold tracking-[0.04em] text-gray-500 border border-gray-300 rounded px-1.5 py-[3px] bg-white whitespace-nowrap">
                          ATTRIBUTES
                        </span>
                      </div>

                      <div
                        ref={msgsRef}
                        className="flex-1 px-2 py-2 flex flex-col gap-1.5 overflow-hidden"
                        style={{ minHeight: 0 }}
                      >
                        <div className="self-center text-[8px] font-semibold text-gray-400 uppercase tracking-[0.07em] bg-gray-200 px-2 py-0.5 rounded-full">
                          TODAY
                        </div>
                        {/* Initial WA bubble */}
                        <div
                          style={{
                            background: "#E7F9E7",
                            borderRadius: "2px 12px 12px 12px",
                            padding: "9px 10px 6px",
                            fontSize: "10px",
                            lineHeight: "1.5",
                            color: "#111827",
                            border: "1px solid rgba(37,211,102,0.14)",
                          }}
                        >
                          Hi! I placed an order yesterday but haven't received a
                          confirmation email yet — order #8823. Could you help
                          me track it?
                          <div className="flex items-center justify-center gap-1 mt-1 px-2 py-1 border border-gray-300 rounded-lg text-[9.5px] font-semibold text-blue-700 bg-white cursor-pointer">
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 5.47 5.47l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z" />
                            </svg>
                            Call Us Now
                          </div>
                          <div className="flex items-center justify-center gap-1 mt-1 px-2 py-1 border border-gray-300 rounded-lg text-[9.5px] font-semibold text-blue-700 bg-white cursor-pointer">
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            Track My Order
                          </div>
                          <div className="text-[7.5px] text-gray-400 text-right mt-1 italic">
                            Powered by rateup.app
                          </div>
                          <div className="text-[7.5px] text-gray-400 text-right mt-0.5">
                            08:16 am ✓✓
                          </div>
                        </div>
                        {/* Customer reply */}
                        <div className="flex items-end gap-1.5">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white flex-shrink-0"
                            style={{ background: "#6B7280" }}
                          >
                            SC
                          </div>
                          <div>
                            <div
                              className="text-[10px] text-gray-700 rounded-[10px_10px_10px_2px] px-2.5 py-1.5"
                              style={{
                                background: "#fff",
                                border: "1px solid #E5E7EB",
                              }}
                            >
                              Still waiting — any update? 🙏
                            </div>
                            <div className="text-[7.5px] text-gray-400 mt-0.5">
                              08:57 am
                            </div>
                          </div>
                        </div>
                        {/* Typing */}
                        <div
                          ref={typingRef}
                          className="flex gap-0.5 items-center px-2.5 py-1.5 w-fit rounded-[10px_10px_10px_2px] transition-opacity duration-300"
                          style={{
                            background: "#fff",
                            border: "1px solid #E5E7EB",
                          }}
                        >
                          <span
                            className={`w-1 h-1 rounded-full bg-gray-400 ${style.tdot}`}
                          />
                          <span
                            className={`w-1 h-1 rounded-full bg-gray-400 ${style.tdot}`}
                          />
                          <span
                            className={`w-1 h-1 rounded-full bg-gray-400 ${style.tdot}`}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mx-2 mb-1.5 px-2.5 py-1 rounded bg-blue-700 text-white text-[9px] font-bold tracking-[0.04em] cursor-pointer flex-shrink-0">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                        AUTOMATION
                      </div>
                      <div
                        className="flex items-center gap-1.5 px-2 py-1.5 border-t flex-shrink-0"
                        style={{ background: "#fff", borderColor: "#E5E7EB" }}
                      >
                        <input
                          placeholder="Reply to Sarah…"
                          className="flex-1 border rounded-lg px-2 py-1 text-[9.5px] text-gray-700 outline-none"
                          style={{
                            background: "#F9FAFB",
                            borderColor: "#E5E7EB",
                            fontSize: "9.5px",
                          }}
                        />
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-white flex-shrink-0 cursor-pointer"
                          style={{
                            background:
                              "linear-gradient(135deg,#3D8BEE,#2360C8)",
                          }}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

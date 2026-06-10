import { useEffect, useRef } from "react";

import { useNavigate } from "@tanstack/react-router";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal";

import style from "./feedback.module.css";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getTime() {
  const now = new Date();
  return now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0");
}

export default function Hero() {
  const waBodyRef = useRef(null);
  const heroVisibleRef = useRef(true);
  const runningRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const waBody = waBodyRef.current;
    if (!waBody) return;
    if (runningRef.current) return;
    runningRef.current = true;

    function mkMsg(side, html, showTime) {
      const d = document.createElement("div");
      const base =
        "msg max-w-[84%] px-2.5 pt-[7px] pb-2 text-[13px] leading-[1.4] text-[#111b21] rounded-[10px] relative shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] break-words transition-all duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] opacity-0 translate-y-2 scale-[0.97]";
      const sideClass =
        side === "in"
          ? "in bg-white self-start rounded-tl-[3px]"
          : "out bg-[#D9FDD3] self-end rounded-tr-[3px]";
      d.className = `${base} ${sideClass}`;

      const timeColor = side === "out" ? "text-[#4a8a64]" : "text-[#667781]";
      const timeHtml = showTime
        ? `<span class="block text-[9.5px] ${timeColor} text-right mt-0.5">${getTime()}${side === "out" ? " ✓✓" : ""}</span>`
        : "";

      d.innerHTML = html + timeHtml;
      waBody.appendChild(d);
      requestAnimationFrame(() => {
        d.classList.remove("opacity-0", "translate-y-2", "scale-[0.97]");
      });
      waBody.scrollTop = waBody.scrollHeight;
      return d;
    }

    function mkTyping() {
      const d = document.createElement("div");
      d.className =
        "typing show self-start bg-white rounded-[10px] rounded-tl-[3px] p-[9px_12px] inline-flex gap-[3px] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]";
      d.innerHTML = `
        <span class="w-1.5 h-1.5 rounded-full bg-[#9aa6ad] animate-blink"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-[#9aa6ad] animate-blink [animation-delay:0.2s]"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-[#9aa6ad] animate-blink [animation-delay:0.4s]"></span>
      `;
      waBody.appendChild(d);
      waBody.scrollTop = waBody.scrollHeight;
      return d;
    }

    function mkReplies(labels: string[], rowWrap?: boolean) {
      const wrap = document.createElement("div");
      wrap.className =
        "wa-replies flex flex-col gap-1.5 self-stretch mt-0.5" +
        (rowWrap ? " row-wrap !flex-row flex-wrap !gap-1.25" : "");
      labels.forEach((l, i) => {
        const b = document.createElement("div");
        b.className = `qr bg-white ${style.fbGreen} font-bold text-xs text-center px-2.5 py-1.75 rounded-lg shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] flex items-center justify-center gap-1.25 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] flex-1 min-w-[48px] opacity-0 translate-y-2`;
        b.textContent = l;
        wrap.appendChild(b);
        setTimeout(
          () => {
            b.classList.remove("opacity-0", "translate-y-2");
          },
          100 * (i + 1),
        );
      });
      waBody.appendChild(wrap);
      waBody.scrollTop = waBody.scrollHeight;
      return wrap;
    }

    function countUp(el, from, to, dur) {
      if (!el) return;
      const start = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(from + (to - from) * eased);
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    function mkFbCard() {
      const d = document.createElement("div");
      d.className =
        "fb-card bg-white rounded-xl p-[10px_12px] max-w-[90%] self-start shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] transition-all duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] opacity-0 translate-y-2 scale-[0.97]";
      const respId = "resp-" + Date.now();
      d.innerHTML = `
        <div class="flex items-center justify-between text-[11px] text-[#54656f] px-0.5 py-1">
          <span>📊 Responses This Week</span>
          <span class="font-extrabold text-[13px] text-[#2a6254]" id="${respId}">0</span>
        </div>
        <div class="flex items-center justify-between text-[11px] text-[#54656f] px-0.5 py-1 border-t border-dashed border-[#e6e9ec]">
          <span>⭐ Avg Rating</span>
          <span class="font-extrabold text-[13px] text-[#111b21]">4.8 / 5.0</span>
        </div>
        <div class="flex items-center justify-between text-[11px] text-[#54656f] px-0.5 py-1 border-t border-dashed border-[#e6e9ec]">
          <span>📈 Response Rate</span>
          <span class="font-extrabold text-[13px] text-[#2a6254]">35%</span>
        </div>`;
      waBody.appendChild(d);
      requestAnimationFrame(() => {
        d.classList.remove("opacity-0", "translate-y-2", "scale-[0.97]");
      });
      waBody.scrollTop = waBody.scrollHeight;
      countUp(document.getElementById(respId), 580, 662, 1400);
      return d;
    }

    async function typingThen(ms) {
      const t = mkTyping();
      await sleep(ms);
      t.remove();
    }

    function clearChat() {
      waBody
        .querySelectorAll(".msg, .typing, .fb-card, .wa-replies")
        .forEach((n) => n.remove());
    }

    async function runHero() {
      while (true) {
        clearChat();
        while (!heroVisibleRef.current) await sleep(200);
        await sleep(400);

        mkMsg("out", "Just had an amazing dinner at Spice Garden! 🍛", true);
        await sleep(1000);
        await typingThen(1100);

        mkMsg(
          "in",
          "Hi Priya! 😊 So glad you enjoyed it. Would you take 30 seconds to share your feedback?",
          true,
        );
        await sleep(600);
        mkReplies(["Yes, Happy To! 👍", "Maybe Later"]);
        await sleep(1400);

        mkMsg("out", "Yes, Happy To! 👍", true);
        await sleep(900);
        await typingThen(1000);

        mkMsg("in", "How would you rate your overall experience?", true);
        await sleep(500);
        mkReplies(["⭐", "⭐⭐", "⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐⭐⭐"], true);
        await sleep(1500);

        mkMsg("out", "⭐⭐⭐⭐⭐ Excellent!", true);
        await sleep(900);
        await typingThen(1000);

        mkMsg("in", "That's wonderful! 🎉 What did you love most?", true);
        await sleep(500);
        mkReplies(["Food Quality 🍽️", "Service 💛", "Ambiance ✨"]);
        await sleep(1300);

        mkMsg("out", "Food Quality 🍽️", true);
        await sleep(900);
        await typingThen(1100);

        mkMsg(
          "in",
          "Thank you Priya! Your feedback has been recorded. 🙏 It helps us serve you better.",
          true,
        );
        await sleep(700);
        mkFbCard();
        await sleep(4000);

        waBody.querySelectorAll(".msg, .fb-card, .wa-replies").forEach((n) => {
          n.style.transition = "opacity .5s ease";
          n.style.opacity = "0";
        });
        await sleep(650);
      }
    }

    runHero();

    return () => {
      runningRef.current = false;
    };
  }, []);

  return (
    <section className="relative overflow-hidden text-white py-14 pb-20 md:py-16 md:pb-24 bg-[radial-gradient(120%_90%_at_50%_-10%,#163A2D_0%,#0E2620_48%,#081814_100%)]">
      {/* overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(closest-side_at_74%_42%,rgba(37,211,102,0.11),transparent_70%),radial-gradient(closest-side_at_20%_78%,rgba(248,149,29,0.07),transparent_70%)]" />
      {/* beam */}
      <div className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[90px] h-[360px] z-[1] bg-gradient-to-b from-[rgba(100,230,160,0.8)] to-transparent blur-[28px] opacity-45 [mask-image:linear-gradient(to_bottom,#000,transparent)]" />

      <div className="grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr] gap-8 md:gap-10 items-center relative z-[2] max-w-[1320px] mx-auto px-5 md:px-8">
        {/* Hero copy */}
        <div className="max-md:text-center">
          <span className="inline-flex items-center gap-2.5 bg-white/[0.07] border border-white/[0.13] rounded-full py-[9px] pr-[18px] pl-3.5 text-sm font-bold text-white backdrop-blur-sm">
            <span className={`inline-flex gap-0.5 ${style.warm300}`}>
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className="w-[15px] h-[15px]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </span>
            Trusted By 500+ Businesses
          </span>

          <h1
            className={`${style.displayFont} font-black text-[clamp(40px,5.2vw,74px)] leading-[1.02] tracking-[-0.03em] text-white mt-[26px] mb-0`}
          >
            Stop Guessing
            <br />— Grow Smarter
            <br />
            <span className="text-[#6EC5A8] [text-shadow:0_0_40px_rgba(80,200,150,0.5)]">
              with WhatsApp
              <br />
              Customer Feedback
            </span>
          </h1>

          <p className="text-[17px] md:text-[19px] leading-[1.55] text-white/70 max-w-[520px] mt-5 md:mt-6 mb-7 md:mb-[34px] max-md:mx-auto">
            Traditional feedback methods yield only 2% response rates. RateUp
            uses WhatsApp Flows to connect with customers where they already are
            — boosting feedback by up to 35% and turning insights into real
            growth.
          </p>

          <div className="flex gap-3.5 flex-wrap max-md:justify-center">
            <button
              onClick={() => navigate({ to: "/signup" })}
              className="inline-flex items-center gap-3 border-0 rounded-2xl font-extrabold text-base tracking-[-0.01em] pl-[22px] py-[6px] pr-[6px] text-white bg-[linear-gradient(135deg,#2a6254,#3d7a68)] shadow-[0_10px_26px_rgba(42,98,84,0.40)] hover:shadow-[0_14px_34px_rgba(42,98,84,0.55)] hover:-translate-y-0.5 active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap"
            >
              Start Free Trial
              <span
                className={`inline-flex items-center justify-center w-[38px] h-[38px] rounded-[10px] ${style.bgChipDark} flex-shrink-0`}
              >
                <svg
                  className="w-[18px] h-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 6 15 12 9 18" />
                </svg>
              </span>
            </button>
            <BookDemoModal>
              <button
                className={`inline-flex items-center gap-3 border-0 rounded-2xl font-extrabold text-base pl-[22px] py-[6px] pr-[6px] text-[#0F2820] ${style.bgPeriwinkle} ${style.hoverBgPeriwinkle2} hover:-translate-y-0.5 active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap`}
              >
                Schedule a Demo
                <span className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-white/65 flex-shrink-0">
                  <svg
                    className="w-[18px] h-[18px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
              </button>
            </BookDemoModal>
          </div>
        </div>

        {/* Hero visual */}
        <div
          className="relative min-h-[520px] md:min-h-[620px] flex items-center justify-center mt-4 md:mt-0"
          id="heroVisual"
        >
          {/* Float widget: rate */}
          <div
            className={`absolute z-[6] bg-white rounded-[18px] p-[16px_18px] shadow-[0_18px_44px_rgba(0,0,0,0.22)] left-[-18px] top-[26%] min-w-[148px] hidden sm:block ${style.floatA}`}
          >
            <div
              className={`text-[11px] ${style.ink400} font-semibold mb-1 uppercase tracking-[0.05em]`}
            >
              Response Rate
            </div>
            <div
              className={`${style.displayFont} font-black text-[28px] ${style.fbGreen} tracking-[-0.02em] leading-[1.1]`}
            >
              35%
            </div>
            <div className="inline-flex items-center gap-1 text-[12px] font-bold text-green-600 mt-0.5">
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              vs 2% email
            </div>
          </div>

          {/* Phone */}
          <div className="relative z-[3] w-[260px] h-[522px] sm:w-[308px] sm:h-[618px] bg-[#0b0b0d] rounded-[38px] sm:rounded-[46px] p-[9px] sm:p-[11px] shadow-[0_50px_90px_rgba(0,0,0,0.55),0_0_0_2px_rgba(255,255,255,0.06),0_0_60px_rgba(37,211,102,0.10)] mx-auto sm:ml-auto">
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[116px] h-[30px] bg-[#0b0b0d] rounded-[18px] z-[5]" />
            <div className="relative h-full rounded-[38px] overflow-hidden bg-[#E7DCD3] flex flex-col">
              {/* WA head */}
              <div className="bg-[#075E54] text-white pt-[38px] pb-3 px-3.5 flex items-center gap-2.5 flex-shrink-0">
                <div className="w-9 h-9 rounded-full flex-shrink-0 bg-gradient-to-br from-[#3a7a5a] to-[#1a4a34] flex items-center justify-center font-extrabold text-white text-[13px]">
                  SG
                </div>
                <div>
                  <div className="text-[15px] font-bold leading-tight">
                    Spice Garden
                  </div>
                  <div className="text-[11px] text-white/70">
                    business account · online
                  </div>
                </div>
                <div className="ml-auto flex gap-4 opacity-90">
                  <svg
                    className="w-[18px] h-[18px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M23 7l-7 5 7 5V7z" />
                    <rect x="1" y="5" width="15" height="14" rx="2" />
                  </svg>
                  <svg
                    className="w-[18px] h-[18px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
              </div>
              {/* WA body */}
              <div
                ref={waBodyRef}
                className="flex-1 px-3 py-3.5 overflow-hidden relative bg-[#E7DCD3] [background-image:radial-gradient(rgba(0,0,0,0.025)_1px,transparent_1px)] [background-size:18px_18px] flex flex-col gap-2 justify-end"
              >
                <div className="self-center bg-white/70 text-[#54656f] text-[10px] font-semibold px-2.5 py-[3px] rounded-lg mb-1">
                  TODAY
                </div>
              </div>
              {/* WA input */}
              <div className="bg-[#F0F2F5] px-3 py-[9px] flex items-center gap-2.5 flex-shrink-0">
                <div className="flex-1 bg-white rounded-[18px] px-3.5 py-2 text-[12px] text-[#8696a0]">
                  Message
                </div>
                <div className="w-[34px] h-[34px] rounded-full bg-[#00A884] flex items-center justify-center text-white flex-shrink-0">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Float widget: count */}
          <div
            className={`absolute z-[6] bg-white rounded-[18px] p-[16px_18px] shadow-[0_18px_44px_rgba(0,0,0,0.22)] right-[-22px] bottom-[28%] min-w-[138px] hidden sm:block ${style.floatB} [animation-delay:0.6s]`}
          >
            <div
              className={`text-[11px] ${style.ink400} font-semibold mb-1 uppercase tracking-[0.05em]`}
            >
              This Week
            </div>
            <div
              className={`${style.displayFont} font-black text-[28px] ${style.fbGreen} tracking-[-0.02em] leading-[1.1]`}
            >
              662
            </div>
            <div className={`text-[12px] ${style.ink400} mt-[3px]`}>
              feedback responses
            </div>
            <div className="inline-flex items-center gap-1 text-[12px] font-bold text-green-600 mt-0.5">
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              +23% vs last week
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

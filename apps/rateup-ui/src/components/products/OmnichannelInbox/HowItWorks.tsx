import { useEffect, useRef, useState } from "react";

import style from "./omnichannel.module.css";

const steps = [
  {
    icon: (
      <svg
        width="34"
        height="34"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    title: "Connect your channels",
    body: "Link WhatsApp, Instagram & Messenger in a few clicks. No developers required.",
  },
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Set up your team",
    body: "Add staff, create teams, assign roles. Everyone gets the right level of access.",
  },
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: "Build your automations",
    body: "Define rules for routing, tagging, and auto-replies. Let RateUp handle the repetitive stuff.",
  },
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="m9 10 2 2 4-4" />
      </svg>
    ),
    title: "Start responding, together",
    body: "Your whole team works from one shared inbox. Customers get faster, better replies. Every time.",
  },
];

export default function HowItWorks() {
  const [doneCount, setDoneCount] = useState(0);

  const sectionRef = useRef<HTMLElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step animation
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const tick = () => {
      setDoneCount((prev) => {
        if (prev >= steps.length) {
          setTimeout(() => {
            setDoneCount(0);
          }, 900);

          return prev;
        }

        return prev + 1;
      });
    };

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !timerRef.current) {
          timerRef.current = setInterval(tick, 1150);
        }

        if (!e.isIntersecting && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      },
      {
        threshold: 0.3,
      },
    );

    io.observe(section);

    return () => {
      io.disconnect();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const fillPct = Math.min((doneCount / (steps.length - 1)) * 75, 75);

  return (
    <section id="how" ref={sectionRef} className="py-20">
      <div className="max-w-[1200px] mx-auto px-7">
        <div className="text-center max-w-[720px] mx-auto mb-[52px]">
          <span className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] px-[15px] py-[7px] rounded-full mb-5 text-ru-blue-300 bg-ru-blue-400/10 border border-ru-blue-400/22">
            <span className="w-1.5 h-1.5 rounded-full bg-ru-blue-300 shadow-[0_0_10px_var(--color-ru-blue-300)]" />
            Simple to set up. Powerful from day one.
          </span>
          <h6 className="reveal d1 font-display font-black text-white leading-[1.06] tracking-[-0.025em] mt-5 mb-4 text-[clamp(32px,4.2vw,54px)]">
            From scattered to streamlined
            <br />
            <span className="bg-gradient-to-r from-[#6BD0FF] via-ru-blue-400 to-[#2C6FD6] bg-clip-text text-transparent">
              in minutes.
            </span>
          </h6>
        </div>

        <div className={`${style.flow} reveal d1`}>
          {/* Track line */}
          <div className={style["flow-line"]} />
          <div className={style["flow-line-fill"]} style={{ width: `${fillPct}%` }} />

          <div className={style["flow-steps"]}>
            {steps.map((s, i) => {
              const isDone = i < doneCount;
              const isActive = i === doneCount;
              return (
                <div
                  key={i}
                  className={`
                    ${style.fstep}
                    ${isDone ? style.done : ""}
                    ${isActive ? style.active : ""}
                  `}
                >
                  <div className={style.badge}>
                    <span className={style.num}>{i + 1}</span>
                    {s.icon}
                  </div>
                  <h6>{s.title}</h6>
                  <p>{s.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

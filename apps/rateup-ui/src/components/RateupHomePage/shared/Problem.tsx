import { useEffect, useRef } from "react";

import style from "@/styles/commonCssModules/homepagecss.module.css";

interface PstatProps {
  pct: number;
  label: string;
  delay?: string;
}

function Pstat({ pct, label, delay }: PstatProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || animated.current) return;

        animated.current = true;

        if (barRef.current) {
          barRef.current.style.width = `${pct}%`;
        }

        if (ringRef.current) {
          const C = 175.9;

          ringRef.current.style.transition = "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)";

          ringRef.current.style.strokeDashoffset = String((C * (1 - pct / 100)).toFixed(1));
        }
      },
      { threshold: 0.25 },
    );

    io.observe(root);

    return () => io.disconnect();
  }, [pct]);

  return (
    <div ref={rootRef} className={`${style.pstat} ${style.reveal}`} data-d={delay}>
      <div className={style.ring}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="30" fill="#071A33" />

          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="4"
          />

          <circle
            ref={ringRef}
            className={style["ring-prog"]}
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="#4FC3FF"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="175.9"
            strokeDashoffset="175.9"
            transform="rotate(-90 32 32)"
          />
        </svg>

        <div className={style.pct}>{pct}%</div>
      </div>

      <div className={style.meta}>
        <div className={style.t}>{label}</div>

        <div className={style.bar}>
          <span ref={barRef} />
        </div>
      </div>
    </div>
  );
}

export default function Problem() {
  useEffect(() => {
    const elements = document.querySelectorAll(`.${style.reveal}`);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(style.in);
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
    <section className={style.section} id="problem">
      <div className={style.page}>
        <div className={style["sec-head"]}>
          <span className={`${style.eyebrow} ${style.reveal}`}>
            <span className={style.dot} />
            The Problem
          </span>

          <h2 className={style.reveal} data-d="1">
            Your Business Goes Silent
            <br />
            The Moment Someone Buys
          </h2>

          <p className={style.reveal} data-d="2">
            The sale ends. The relationship doesn't begin. Without a system for what happens next,
            customers disappear — and you never know why.
          </p>
        </div>

        <div className={style["prob-grid"]}>
          <div className={`${style.prob} ${style.reveal}`}>
            <div className={`${style.picon} ${style["pi-1"]}`}>
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
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                <rect x="4" y="11" width="16" height="10" rx="2" />
              </svg>
            </div>

            <h3>You're Paying Twice For The Same Customer</h3>

            <p>Without follow-ups, first-time buyers leave — and you pay to replace them.</p>
          </div>

          <div className={`${style.prob} ${style.reveal}`} data-d="1">
            <div className={`${style.picon} ${style["pi-2"]}`}>
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
                <circle cx="12" cy="12" r="10" />
                <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                <path d="M9 9h.01M15 9h.01" />
              </svg>
            </div>

            <h3>Unhappy Customers Leave Without A Word</h3>

            <p>Only 1 in 26 unhappy customers speak up. The rest leave — before you notice.</p>
          </div>

          <div className={`${style.prob} ${style.reveal}`} data-d="2">
            <div className={`${style.picon} ${style["pi-3"]}`}>
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
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>

            <h3>5 Tools That Don't Talk To Each Other</h3>

            <p>
              Your team juggles multiple tools. Data is scattered, experiences break, and revenue
              leaks.
            </p>
          </div>

          <div className={`${style.prob} ${style.reveal}`} data-d="3">
            <div className={`${style.picon} ${style["pi-4"]}`}>
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
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61" />
                <path d="M2 2l20 20" />
              </svg>
            </div>

            <h3>No Visibility Into What Customers Feel</h3>

            <p>You have order data, not sentiment data — so decisions rely on guesswork.</p>
          </div>
        </div>

        <div className={style.probstats}>
          <Pstat pct={71} label="No Follow-Ups" />
          <Pstat pct={68} label="Never Return" delay="1" />
          <Pstat pct={52} label="Silent Churners" delay="2" />
          <Pstat pct={72} label="Issues Unresolved" delay="3" />
        </div>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from "react";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

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
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg>
    ),
    title: "Purchase",
    desc: "Profile auto-created",
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
      </svg>
    ),
    title: "Feedback",
    desc: "WhatsApp message sent",
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
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
    title: "Recovery",
    desc: "Issues auto-resolved",
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
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
        <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
      </svg>
    ),
    title: "Reward",
    desc: "Loyalty + referrals",
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
        <path d="M3 11l18-5v12L3 14v-3z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </svg>
    ),
    title: "Campaign",
    desc: "Smart re-engagement",
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
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      </svg>
    ),
    title: "Repeat",
    desc: "The loop compounds",
  },
];

export default function HowItWorks() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [doneCount, setDoneCount] = useState(0);

  const sectionRef = useRef<HTMLElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lineFillRef = useRef<HTMLDivElement>(null);

  // Reveal animation
  useEffect(() => {
    const elements = document.querySelectorAll(`.${styles.reveal}`);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.in);
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

  // Step animation
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const tick = () => {
      setDoneCount((prev) => {
        if (prev >= steps.length) {
          setTimeout(() => {
            setDoneCount(0);
            setActiveIdx(0);
          }, 900);

          return prev;
        }

        setActiveIdx(prev);

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

  const fillPct = Math.min((doneCount / steps.length) * 84, 84);

  return (
    <section className={styles.section} id="how" ref={sectionRef}>
      <div className={styles.page}>
        <div className={styles["sec-head"]}>
          <span className={`${styles.eyebrow} ${styles.reveal}`}>
            <span className={styles.dot} />
            How RateUp Works
          </span>

          <h2 className={styles.reveal} data-d="1">
            One Purchase.
            <br />
            <span className={styles["grad-cyan"]}>An Automated Relationship.</span>
          </h2>

          <p className={styles.reveal} data-d="2">
            RateUp triggers a complete customer journey the moment a sale happens — across any
            business, any channel, any vertical.
          </p>
        </div>

        <div className={`${styles.flow} ${styles.reveal}`} data-d="1">
          <div className={styles["flow-line"]} />

          <div
            ref={lineFillRef}
            className={styles["flow-line-fill"]}
            style={{ width: `${fillPct}%` }}
          />

          <div className={styles["flow-steps"]}>
            {steps.map((s, i) => {
              const isDone = i < doneCount;
              const isActive = i === activeIdx && !isDone;

              return (
                <div
                  key={i}
                  className={`
                    ${styles.fstep}
                    ${isDone ? styles.done : ""}
                    ${isActive ? styles.active : ""}
                  `}
                >
                  <div className={styles.badge}>
                    <span className={styles.num}>{i + 1}</span>

                    {s.icon}
                  </div>

                  <h3>{s.title}</h3>

                  <p>{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

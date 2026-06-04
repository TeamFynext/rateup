import { useEffect, useRef, useState } from "react";

import styles from "./loyalty.landing.module.css";

const testimonials = [
  {
    badge: "+47% Repeat Purchases",
    quote:
      '"Our repeat purchase rate increased by 47% in just 3 months. WhatsApp loyalty made it so easy for customers to engage with our brand daily."',
    name: "Sanjith",
    role: "Head of IT | Bhima Jewellery",
    av: "#7a1f2b",
    logo: { txt: "BHIMA", bg: "#6e1722", fg: "#e9c97a" },
  },
  {
    badge: "10 Min Setup Time",
    quote:
      '"Setting up took less than 10 minutes. Now our customers love getting rewards directly in WhatsApp. Absolute game changer for our retention strategy!"',
    name: "Akhil",
    role: "Marketing Manager | myG",
    av: "#3a4350",
    logo: { txt: "myG", bg: "#e0822e", fg: "#ffffff" },
  },
  {
    badge: "3x Engagement",
    quote:
      '"Engagement tripled overnight. Our customers actually open every message and redeem offers the same day — something email never did for us."',
    name: "Priya Nair",
    role: "Founder | Bloom Beauty",
    av: "#9a5fb0",
    logo: { txt: "bloom", bg: "#ffffff", fg: "#9a5fb0" },
  },
  {
    badge: "+62% Referrals",
    quote:
      '"The referral program runs itself. Loyal customers bring in new ones and both get rewarded automatically — referrals are up 62% this quarter."',
    name: "David Park",
    role: "Head of Growth | Kettle",
    av: "#2f7d6b",
    logo: { txt: "Kettle", bg: "#163d2f", fg: "#7fe0b0" },
  },
];

function StarSVG() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function TestimonialCard({ t }: Readonly<{ t: (typeof testimonials)[0] }>) {
  const initials = t.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
  return (
    <div className={styles.tcard}>
      <span className={styles.qbadge}>{t.badge}</span>
      <p className={styles.quote}>{t.quote}</p>
      <div className={styles.stars}>
        {[...new Array(5)].map((_, i) => (
          <StarSVG key={i} />
        ))}
      </div>
      <div className={styles.person}>
        <div className={styles.pav} style={{ background: t.av }}>
          {initials}
        </div>
        <div>
          <div className={styles.pn}>{t.name}</div>
          <div className={styles.pr}>{t.role}</div>
        </div>
      </div>
      <span
        className={styles.blogo}
        style={{ background: t.logo.bg, color: t.logo.fg }}
      >
        {t.logo.txt}
      </span>
    </div>
  );
}

const stats = [
  {
    count: 2500,
    suffix: "+",
    label: "Loyalty Campaigns Automated",
    desc: "Driving Repeat Purchases Across 40+ Brands",
  },
  {
    count: 1.2,
    suffix: "M+",
    dec: 1,
    label: "Rewards Delivered",
    desc: "Points, Cashback & Referral Rewards Sent",
  },
  {
    count: 45,
    suffix: "%",
    label: "Higher Customer Retention",
    desc: "Achieved Through WhatsApp Loyalty Journeys",
  },
];

export default function Trusted() {
  const [tPtr, setTPtr] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const statsRef = useRef<HTMLDivElement>(null);
  const countedRef = useRef(false);

  const handlePrev = () => {
    setOpacity(0);
    setTimeout(() => {
      setTPtr((p) => (p - 1 + testimonials.length) % testimonials.length);
      setOpacity(1);
    }, 180);
  };

  const handleNext = () => {
    setOpacity(0);
    setTimeout(() => {
      setTPtr((p) => (p + 1) % testimonials.length);
      setOpacity(1);
    }, 180);
  };

  useEffect(() => {
    const container = statsRef.current;
    if (!container) return;

    const statEls = container.querySelectorAll<HTMLElement>("[data-count]");

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting || countedRef.current) return;
          countedRef.current = true;
          statEls.forEach((el) => {
            const target = Number.parseFloat(el.dataset.count!);
            const dec = Number.parseInt(el.dataset.dec || "0", 10);
            const suffix = el.dataset.suffix || "";
            const start = performance.now();
            const dur = 1600;
            function tick(now: number) {
              const p = Math.min(1, (now - start) / dur);
              const eased = 1 - Math.pow(1 - p, 3);
              const val = target * eased;
              el.textContent =
                (dec ? val.toFixed(dec) : Math.round(val).toLocaleString()) +
                suffix;
              if (p < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
          });
        });
      },
      { threshold: 0.5 },
    );

    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  const cardA = testimonials[tPtr % testimonials.length];
  const cardB = testimonials[(tPtr + 1) % testimonials.length];

  return (
    <section
      className={`${styles.trusted} ${styles["on-dark"]}`}
      id="trusted"
      data-screen-label="Trusted"
    >
      <div className={styles.wrap}>
        <div className={`${styles["sec-head"]} ${styles.reveal}`}>
          <h2>Trusted by Growing Businesses</h2>
          <p>
            See how businesses like yours are driving customer loyalty with
            WhatsApp
          </p>
        </div>

        <div className={`${styles.tcards} ${styles.reveal}`}>
          <div
            className={styles["tcards-track"]}
            style={{ opacity, transition: "opacity .4s ease" }}
          >
            <TestimonialCard t={cardA} />
            <TestimonialCard t={cardB} />
          </div>
          <div className={styles.tnav}>
            <button onClick={handlePrev} aria-label="Previous">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button onClick={handleNext} aria-label="Next">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        <div className={`${styles.tstats} ${styles.reveal}`} ref={statsRef}>
          <div className={styles.row}>
            {stats.map((s) => (
              <div className={styles.tstat} key={s.label}>
                <div
                  className={styles.n}
                  data-count={s.count}
                  data-suffix={s.suffix}
                  data-dec={s.dec}
                >
                  0
                </div>
                <div className={styles.l}>{s.label}</div>
                <div className={styles.d}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

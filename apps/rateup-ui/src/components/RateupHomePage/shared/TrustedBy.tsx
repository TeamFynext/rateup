import { useEffect, useRef } from "react";

import { Image } from "@unpic/react";

import styles from "@/styles/commonCssModules/homepagecss.module.css";
import { imagesPath } from "@/utils/constants";

const logo1 = `${imagesPath}/homepage/CLIENTS/1.png`;
const logo2 = `${imagesPath}/homepage/CLIENTS/2.png`;
const logo3 = `${imagesPath}/homepage/CLIENTS/3.png`;
const logo4 = `${imagesPath}/homepage/CLIENTS/4.png`;
const logo5 = `${imagesPath}/homepage/CLIENTS/5.png`;
const logo6 = `${imagesPath}/homepage/CLIENTS/6.png`;
const logo7 = `${imagesPath}/homepage/CLIENTS/7.png`;
const logo8 = `${imagesPath}/homepage/CLIENTS/8.png`;
const logo9 = `${imagesPath}/homepage/CLIENTS/9.png`;
const logo10 = `${imagesPath}/homepage/CLIENTS/10.png`;
const logo11 = `${imagesPath}/homepage/CLIENTS/11.png`;
const logo12 = `${imagesPath}/homepage/CLIENTS/12.png`;
const logo13 = `${imagesPath}/homepage/CLIENTS/13.png`;
const logo14 = `${imagesPath}/homepage/CLIENTS/14.png`;

const logos = [
  logo1,
  logo2,
  logo3,
  logo4,
  logo5,
  logo6,
  logo7,
  logo8,
  logo9,
  logo10,
  logo11,
  logo12,
  logo13,
  logo14,
];

interface MetricProps {
  count: number;
  suffix: string;
  label: string;
  warm?: boolean;
}

function Metric({ count, suffix, label, warm }: MetricProps) {
  const ref = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || animated.current) return;
        animated.current = true;
        const dur = 1300;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent =
            (count % 1 === 0
              ? Math.round(count * eased)
              : (count * eased).toFixed(1)) + suffix;
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = count + suffix;
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [count, suffix]);

  return (
    <div className={styles.metric}>
      <div className={`${styles.n} ${warm ? styles.warm : ""}`} ref={ref}>
        0{suffix}
      </div>
      <div className={styles.l}>{label}</div>
    </div>
  );
}

export default function TrustedBy() {
  return (
    <section
      className={`${styles.section} ${styles["section--tight"]} ${styles.trusted}`}
      id="trusted"
    >
      <div className={styles.page}>
        <div className={styles.reveal}>
          <span className={styles["meta-badge"]}>
            <svg
              width="24"
              height="16"
              viewBox="0 0 40 26"
              fill="none"
              stroke="#0866FF"
              strokeWidth="3.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 13C4 7 6.5 4 10 4c5 0 7.5 9 10 9s5-9 10-9c3.5 0 6 3 6 9s-2.5 9-6 9c-5 0-7.5-9-10-9s-5 9-10 9c-3.5 0-6-3-6-9z" />
            </svg>
            Meta Business Partner
          </span>
        </div>

        <div className={`${styles.line} ${styles.reveal}`} data-d="1">
          Trusted By <span className={styles["grad-cyan"]}>100+</span> Ecommerce
          Brands Across <span className={styles["grad-cyan"]}>30+</span>{" "}
          Countries
        </div>

        <div className={`${styles.logobar} ${styles.reveal}`} data-d="1">
          <div className={styles["logo-track-mask"]}>
            <div className={styles["logo-track"]}>
              {logos.map((l, i) => (
                <span key={i} className={styles.cl}>
                  <Image
                    key={i}
                    src={l}
                    width={100}
                    height={100}
                    alt={`Client Logo ${i + 1}`}
                    className="h-[40px] sm:h-[50px] lg:h-[70px] w-auto object-contain grayscale brightness-0 invert"
                  />
                </span>
              ))}

              {logos.map((l, i) => (
                <span key={`r${i}`} className={styles.cl}>
                  <Image
                    key={i}
                    src={l}
                    width={100}
                    height={100}
                    alt={`Client Logo ${i + 1}`}
                    className="h-[40px] sm:h-[50px] lg:h-[70px] w-auto object-contain grayscale brightness-0 invert"
                  />
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={`${styles.metricbar} ${styles.reveal}`} data-d="2">
          <Metric count={100} suffix="+" label="Active Clients" />
          <Metric count={3} suffix="×" label="More Engagement" warm />
          <Metric count={30} suffix="%" label="Higher Retention" />
          <Metric count={65} suffix="%" label="Less Manual Effort" />
        </div>
      </div>
    </section>
  );
}

import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import styles from "./loyalty.landing.module.css";

export default function Integrations() {
  const stageRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const flows = stage.querySelectorAll<SVGPathElement>(`.${styles.flow}`);
    const animFrames: number[] = [];
    const rafIds: number[] = [];

    flows.forEach((p, i) => {
      p.style.strokeDasharray = "4 10";
      let off = 0;

      const t = setTimeout(() => {
        function anim() {
          off -= 0.6;
          p.style.strokeDashoffset = String(off);
          const rafId = requestAnimationFrame(anim);
          rafIds.push(rafId);
        }
        const rafId = requestAnimationFrame(anim);
        rafIds.push(rafId);
      }, i * 400);

      animFrames.push(t as unknown as number);
    });

    return () => {
      animFrames.forEach((id) => clearTimeout(id));
      rafIds.forEach((id) => cancelAnimationFrame(id));
    };
  }, []);

  return (
    <section
      className={`${styles.integrations} ${styles["on-dark"]}`}
      id="integrations"
      data-screen-label="Integrations"
    >
      <div className={styles.wrap}>
        <div className={styles["intg-stage"]} id="intgStage" ref={stageRef}>
          <svg
            className={styles["intg-svg"]}
            viewBox="0 0 1000 560"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* left spokes */}
            <path d="M500 250 H360 L250 150 H210" />
            <path d="M500 270 H330 L280 270 H230" />
            <path d="M500 290 H300 L260 380 H210" />
            <path d="M420 310 L300 440 H250" />
            {/* right spokes */}
            <path d="M500 250 H640 L760 150 H800" />
            <path d="M500 270 H670 L740 270 H790" />
            <path d="M500 290 H700 L760 380 H800" />
            <path d="M580 310 L720 440 H770" />
            {/* animated flow paths — queried by styles.flow class */}
            <path className={styles.flow} d="M500 270 H670 L740 270 H790" />
            <path className={styles.flow} d="M500 270 H330 L280 270 H230" />
          </svg>

          <div className={styles["chip-beam"]} />
          <div className={styles["chip-core"]}>
            <span className={`${styles.pins} ${styles.l}`}>
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className={`${styles.pins} ${styles.r}`}>
              <i />
              <i />
              <i />
              <i />
            </span>
            <img
              className={styles.st}
              src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/logo-star.svg`}
              alt="RateUp"
            />
          </div>

          {/* ── left nodes ── */}
          <div className={styles["intg-node"]} style={{ left: "17%", top: "23%" }}>
            <svg viewBox="0 0 32 32">
              <circle cx="8" cy="9" r="2.4" fill="none" stroke="#E3506B" strokeWidth="1.6" />
              <circle cx="8" cy="23" r="2.4" fill="none" stroke="#E3506B" strokeWidth="1.6" />
              <circle cx="24" cy="16" r="2.4" fill="none" stroke="#E3506B" strokeWidth="1.6" />
              <circle cx="16" cy="16" r="1.8" fill="#E3506B" />
              <line x1="10.2" y1="10" x2="14.4" y2="15" stroke="#E3506B" strokeWidth="1.4" />
              <line x1="10.2" y1="22" x2="14.4" y2="17" stroke="#E3506B" strokeWidth="1.4" />
              <line x1="17.8" y1="16" x2="21.6" y2="16" stroke="#E3506B" strokeWidth="1.4" />
            </svg>
          </div>

          <div className={styles["intg-node"]} style={{ left: "14%", top: "46%" }}>
            <svg viewBox="0 0 32 32" fill="#FF7A59">
              <path d="M21 13.2V10a2.4 2.4 0 1 0-2.2 0v3.2a6.3 6.3 0 0 0-2.4 1l-7-5.2a2.7 2.7 0 1 0-1.3 1.8l6.9 5.1a6 6 0 1 0 9.3.6L21 13.2zm-2.1 9.6a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4z" />
            </svg>
          </div>

          <div className={styles["intg-node"]} style={{ left: "24%", top: "64%" }}>
            <svg viewBox="0 0 32 32" fill="#F06A2A">
              <path d="M16 5l2.2 7.8 8.1.1-6.5 4.8 2.4 7.7L16 20.6 9.8 25.4l2.4-7.7-6.5-4.8 8.1-.1L16 5z" />
            </svg>
          </div>

          <div className={styles["intg-node"]} style={{ left: "27%", top: "42%" }}>
            <svg viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="13" fill="#25D366" />
              <path
                d="M16 8.4c-4.2 0-7.6 3.4-7.6 7.6 0 1.3.4 2.6 1 3.7L8.4 23.6l4-1c1.1.6 2.3.9 3.6.9 4.2 0 7.6-3.4 7.6-7.6S20.2 8.4 16 8.4zm4.4 10.8c-.2.5-1.1 1-1.5 1.1-.4 0-.9.1-1.4-.1-.3-.1-.8-.2-1.3-.5-2.3-1-3.8-3.3-3.9-3.5-.1-.2-.9-1.2-.9-2.4 0-1.1.6-1.7.8-1.9.2-.2.5-.3.6-.3h.4c.1 0 .3 0 .5.4.2.5.6 1.6.7 1.7.1.1.1.2 0 .4l-.3.4-.3.3c-.1.1-.2.3-.1.5.1.2.6 1 1.3 1.6.9.8 1.6 1 1.8 1.1.2.1.3.1.5-.1.1-.2.6-.6.7-.9.1-.2.3-.2.5-.1.2.1 1.3.6 1.5.7.2.1.4.2.4.3.1.1.1.5-.1.9z"
                fill="#fff"
              />
            </svg>
          </div>

          {/* ── right nodes ── */}
          <div className={styles["intg-node"]} style={{ left: "78%", top: "23%" }}>
            <svg
              viewBox="0 0 32 32"
              fill="none"
              stroke="#1877F2"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 17c-2.2-4.4-4.3-6.6-6.9-6.6C5.7 10.4 3.6 13.2 3.6 16.6S5.7 22.8 9.1 22.8c2.6 0 4.7-2.2 6.9-6.6 2.2-4.4 4.3-6.6 6.9-6.6 3.4 0 5.5 2.8 5.5 6.2s-2.1 6.2-5.5 6.2c-2.6 0-4.7-2.2-6.9-6.6z" />
            </svg>
          </div>

          <div className={styles["intg-node"]} style={{ left: "81%", top: "42%" }}>
            <svg viewBox="0 0 32 32">
              <path
                d="M11 4h13l-2 3H13l-1 1.5L20 10c2 .4 3 1.6 3 3.6V25l-5.5 1.8V14.6c0-.9-.4-1.3-1.2-1.5L11 12v13l-5 1.5V4z"
                fill="#95BF47"
              />
              <path d="M24 7l-2 .6V25l5-1.6V11c0-2-1-3.2-3-3.6V7z" fill="#5E8E3E" />
            </svg>
          </div>

          <div className={styles["intg-node"]} style={{ left: "84%", top: "62%" }}>
            <svg viewBox="0 0 32 32" fill="#4353FF">
              <path d="M24 9l-4.3 9h-4l1.8-3.7c-.4.5-1 .9-1.9.9-1.6 0-2.6-1.2-2.6-2.9 0-2 1.3-3.3 3-3.3 1.1 0 1.8.5 2.1 1.3L19 9h5zM8 9l3 9H7L4 9h4z" />
            </svg>
          </div>

          <div className={styles["intg-node"]} style={{ left: "88%", top: "80%" }}>
            <svg viewBox="0 0 32 32">
              <path d="M9 18.5A2.5 2.5 0 1 1 6.5 16H9v2.5z" fill="#E01E5A" />
              <path
                d="M10.5 18.5A2.5 2.5 0 0 1 13 16a2.5 2.5 0 0 1 2.5 2.5v6.5A2.5 2.5 0 1 1 10.5 25v-6.5z"
                fill="#E01E5A"
              />
              <path d="M13 9a2.5 2.5 0 1 1 2.5-2.5V9H13z" fill="#36C5F0" />
              <path
                d="M13 10.5A2.5 2.5 0 0 1 15.5 13a2.5 2.5 0 0 1-2.5 2.5H6.5A2.5 2.5 0 1 1 6.5 10.5H13z"
                fill="#36C5F0"
              />
              <path d="M23 13a2.5 2.5 0 1 1 2.5 2.5H23V13z" fill="#2EB67D" />
              <path
                d="M21.5 13A2.5 2.5 0 0 1 19 15.5 2.5 2.5 0 0 1 16.5 13V6.5A2.5 2.5 0 1 1 21.5 6.5V13z"
                fill="#2EB67D"
              />
              <path d="M19 23a2.5 2.5 0 1 1-2.5 2.5V23H19z" fill="#ECB22E" />
              <path
                d="M19 21.5A2.5 2.5 0 0 1 16.5 19 2.5 2.5 0 0 1 19 16.5h6.5A2.5 2.5 0 1 1 25.5 21.5H19z"
                fill="#ECB22E"
              />
            </svg>
          </div>
        </div>

        <div className={`${styles["intg-title"]} ${styles.reveal}`}>
          <h3>
            <span className={styles.b}>Seamless</span> Platform Integrations
          </h3>
          <p>
            Connect RateUp with your ecommerce store, CRM, payment gateway, and communication
            platforms to automate loyalty, rewards, and customer engagement effortlessly.
          </p>
          {/* The diagram above is decorative — these are the links a reader (and a crawler)
              can actually follow into the integration cluster. */}
          <p className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-white/70">
            <span>Works with</span>
            <Link
              to="/integrations/shopify"
              className="font-semibold text-white underline underline-offset-2"
            >
              Shopify
            </Link>
            <span>·</span>
            <Link
              to="/integrations"
              className="font-semibold text-white underline underline-offset-2"
            >
              WooCommerce, POS, CRM and 3,000+ apps
            </Link>
          </p>
          <button
            className={`${styles.btn} ${styles["btn-primary"]}`}
            onClick={() =>
              navigate({
                to: "/signup",
              })
            }
          >
            Try For Free
            <span className={styles.chip}>
              <svg
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
        </div>
      </div>
    </section>
  );
}

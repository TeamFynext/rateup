import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import type { CSSProperties } from "react";

import { rateupLogoHorizontalWhiteTransparent } from "@/utils/constants";

import { RateupStar } from "../integrations/logos";

import styles from "@/styles/commonCssModules/404.module.css";

// Individual floating particle
function Particle({ style }: { style: CSSProperties }) {
  return <div className={styles.particle} style={style} />;
}

export default function NotFoundPage() {
  const particlesRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  // Generate particle styles once — stable across renders via useMemo if needed
  const particles = Array.from({ length: 14 }, (_, i) => {
    const size = 2 + Math.random() * 2.5;
    return {
      key: i,
      style: {
        left: `${Math.random() * 100}vw`,
        bottom: `${-5 - Math.random() * 15}vh`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: 0.25 + Math.random() * 0.55,
        animationDuration: `${7 + Math.random() * 11}s`,
        animationDelay: `${-Math.random() * 14}s`,
      },
    };
  });

  return (
    <div className={styles.page}>
      {/* ── Background layers ── */}
      <div className={styles.bgBase} />
      <div className={styles.bgGlowCyan} />
      <div className={styles.bgGlowWarm} />
      <div className={styles.bgGrid} />

      {/* ── Floating particles ── */}
      <div ref={particlesRef} className={styles.particlesContainer}>
        {particles.map(({ key, style }) => (
          <Particle key={key} style={style} />
        ))}
      </div>

      {/* ── Nav ── */}
      <nav className={styles.nav}>
        <a href="https://rateup.app">
          <img className={styles.navLogo} src={rateupLogoHorizontalWhiteTransparent} alt="RateUp" />
        </a>
      </nav>

      {/* ── Main ── */}
      <main className={styles.main}>
        {/* Error chip */}
        <div className={`${styles.errorChip} ${styles.animFadeUp1}`}>
          <span className={styles.chipDot} />
          Error &nbsp;·&nbsp; 404
        </div>

        {/* 4 ★ 4 */}
        <div className={`${styles.numRow} ${styles.animFadeUp2}`} aria-label="404">
          <span className={styles.num4} aria-hidden="true">
            4
          </span>
          <div className={styles.starWrap} aria-hidden="true">
            <RateupStar className={`w-40 h-40 ${styles.starSvg}`} />
          </div>
          <span className={styles.num4} aria-hidden="true">
            4
          </span>
        </div>

        {/* Heading */}
        <h1 className={`${styles.heading} ${styles.animFadeUp3}`}>Page Not Found</h1>

        {/* Body copy */}
        <p className={`${styles.bodyCopy} ${styles.animFadeUp4}`}>
          The page you're looking for doesn't exist or has been moved. Let's get you somewhere
          useful.
        </p>

        {/* CTAs */}
        <div className={`${styles.ctaRow} ${styles.animFadeUp5}`}>
          <button
            onClick={() => navigate({ to: "/" })}
            className={`${styles.btn} ${styles.btnWarm}`}
          >
            <span className={styles.arrow}>←</span>
            Back to Homepage
          </button>
          <button
            onClick={() => {
              const phone = import.meta.env.VITE_SUPPORT_WHATSAPP;
              const message = encodeURIComponent("Hi, I need help with support");
              window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
            }}
            className={`${styles.btn} ${styles.btnGhost}`}
          >
            Contact Support
          </button>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className={`${styles.footer} ${styles.animFadeInFooter}`}>www.rateup.app</footer>
    </div>
  );
}

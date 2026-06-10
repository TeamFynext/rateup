import { useEffect, useRef } from "react";

import style from "./feedback.module.css";

function StatItem({ count, suffix, label, desc, delay }) {
  const numRef = useRef(null);
  const observed = useRef(false);

  useEffect(() => {
    const el = numRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || observed.current) return;
        observed.current = true;
        const dur = 1600;
        const start = performance.now();
        function tick(now) {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(count * eased) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        obs.unobserve(el);
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [count, suffix]);

  return (
    <div className={style.reveal} data-d={delay}>
      <div
        className="font-nunito font-black text-[clamp(40px,5.5vw,68px)] text-white tracking-[-0.02em] leading-none"
        ref={numRef}
      >
        0{suffix}
      </div>
      <div className="font-bold text-[17px] text-white/85 mt-2.5">{label}</div>
      <div className="text-[13px] text-white/50 mt-1">{desc}</div>
    </div>
  );
}

export default function StatsBand() {
  return (
    <section className="bg-[linear-gradient(135deg,#163A2D_0%,#1E4D3C_100%)] py-[68px]">
      <div className="max-w-[1200px] mx-auto px-5 md:px-8">
        <div className="grid grid-cols-5 gap-6 text-center max-lg:grid-cols-1 max-lg:gap-10 items-stretch">
          <StatItem
            count={35}
            suffix="%"
            label="Average Response Rate"
            desc="vs 2% for email surveys"
            delay="0"
          />
          <div className="w-px bg-white/[0.12] max-lg:hidden" />
          <StatItem
            count={98}
            suffix="%"
            label="WhatsApp Open Rate"
            desc="Messages seen, not ignored"
            delay="1"
          />
          <div className="w-px bg-white/[0.12] max-lg:hidden" />
          <StatItem
            count={2}
            suffix="B+"
            label="Active WhatsApp Users"
            desc="Meet customers where they already are"
            delay="2"
          />
        </div>
      </div>
    </section>
  );
}

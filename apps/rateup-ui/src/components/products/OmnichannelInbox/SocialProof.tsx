import { useEffect, useRef } from "react";

import style from "./omnichannel.module.css";

const brands = [
  "Noon",
  "Namshi",
  "myG",
  "VOYE Homes",
  "ShopDoc",
  "ELANCE",
  "Beleaf",
  "Fableut",
];

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        const dur = 1300,
          start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / dur, 1);
          const v = target * (1 - Math.pow(1 - p, 3));
          el.textContent =
            (target % 1 === 0 ? Math.round(v) : v.toFixed(1)) + suffix;
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = target + suffix;
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

export default function SocialProof() {
  return (
    <section className="py-11 text-center" style={{ paddingBottom: "56px" }}>
      <div className="max-w-[1200px] mx-auto px-7">
        <div className="reveal">
          <p
            className="font-display font-black text-white/50 tracking-[-0.01em]"
            style={{ fontSize: "clamp(17px,2vw,24px)" }}
          >
            Trusted by 500+ retail and ecommerce brands across the world!
          </p>
        </div>

        {/* Logo marquee */}
        <div
          className="reveal d1 flex items-stretch mt-8 rounded-[20px] overflow-hidden"
          style={{
            height: "116px",
            background: "rgba(255,255,255,0.045)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          <div className={style["logo-track-mask"]}>
            <div className={style["logo-track"]}>
              {[...brands, ...brands].map((b, i) => (
                <span
                  key={i}
                  className="font-display font-black text-[25px] text-white/52 tracking-[-0.01em] whitespace-nowrap"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stat bar */}
        <div
          className="reveal d2 grid grid-cols-1 sm:grid-cols-3 mt-5 overflow-hidden rounded-[20px]"
          style={{
            background: "linear-gradient(180deg,#08213F,#061730)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          <div
            className="px-5 py-6 text-center border-b sm:border-b-0 sm:border-r"
            style={{ borderColor: "rgba(255,255,255,0.09)" }}
          >
            <div
              className="font-display font-black leading-none tracking-[-0.02em]"
              style={{ fontSize: "clamp(24px,3vw,38px)", color: "#4FC3FF" }}
            >
              <CountUp target={500} suffix="+" />
            </div>
            <div className="text-[13px] text-white/75 mt-[7px] font-medium">
              Brands using RateUp Inbox
            </div>
          </div>
          <div
            className="px-5 py-6 text-center border-b sm:border-b-0 sm:border-r"
            style={{ borderColor: "rgba(255,255,255,0.09)" }}
          >
            <div
              className="font-display font-black leading-none tracking-[-0.02em]"
              style={{ fontSize: "clamp(24px,3vw,38px)", color: "#FFB638" }}
            >
              6<span style={{ fontSize: "0.55em", fontWeight: 800 }}>hr</span> →
              20<span style={{ fontSize: "0.55em", fontWeight: 800 }}>min</span>
            </div>
            <div className="text-[13px] text-white/75 mt-[7px] font-medium">
              Avg. response time improvement
            </div>
          </div>
          <div className="px-5 py-6 text-center">
            <div
              className="font-display font-black leading-none tracking-[-0.02em]"
              style={{ fontSize: "clamp(24px,3vw,38px)", color: "#4FC3FF" }}
            >
              65<span style={{ fontSize: "0.6em", fontWeight: 800 }}>%</span>
            </div>
            <div className="text-[13px] text-white/75 mt-[7px] font-medium">
              Less manual routing work
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

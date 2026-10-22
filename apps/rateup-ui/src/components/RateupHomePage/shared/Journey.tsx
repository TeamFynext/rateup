import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";

import { useIsomorphicLayoutEffect } from "./home-ui";

const SUPPORT = "#5a8cc6";
const SELL = "var(--color-ru-amber-500)";
const BACK = "#22c55e";

interface Step {
  job: string;
  color: string;
  title: string;
  body: string;
  says: string;
  icon: ReactNode;
}

const STEPS: readonly Step[] = [
  {
    job: "Support",
    color: SUPPORT,
    title: "She asks",
    body: "A question lands in your shared inbox.",
    says: "“Can I get the gift box with some coffee?”",
    icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  },
  {
    job: "Support",
    color: SUPPORT,
    title: "You answer",
    body: "A saved reply, a flow or the AI agent replies in seconds.",
    says: "“Of course! Here's what we have.”",
    icon: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  },
  {
    job: "Sell",
    color: SELL,
    title: "She orders & pays",
    body: "Products, a cart and a checkout link in the chat.",
    says: "✅ Order #1038 · $46.00 paid",
    icon: (
      <>
        <path d="M5 8h14l-1.2 11a1.8 1.8 0 0 1-1.8 1.6H8a1.8 1.8 0 0 1-1.8-1.6L5 8Z" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      </>
    ),
  },
  {
    job: "Bring them back",
    color: BACK,
    title: "She rates it",
    body: "Happy? On to Google reviews. Not happy? Your team hears first.",
    says: "🤩 “Loved it!”",
    icon: (
      <path d="M12 3.4l2.6 5.3 5.9.85-4.25 4.15 1 5.9-5.25-2.8-5.25 2.8 1-5.9L3.5 9.55l5.9-.85L12 3.4Z" />
    ),
  },
  {
    job: "Bring them back",
    color: BACK,
    title: "She earns points",
    body: "Rewards credited in the same thread.",
    says: "⭐ +52 points",
    icon: (
      <>
        <rect x="3" y="8" width="18" height="13" rx="2" />
        <path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1" />
      </>
    ),
  },
  {
    job: "Bring them back",
    color: BACK,
    title: "She hears from you",
    body: "A campaign to customers who opted in.",
    says: "“Cold brew week is here ☕”",
    icon: (
      <>
        <path d="m22 2-7 20-4-9-9-4z" />
        <path d="M22 2 11 13" />
      </>
    ),
  },
  {
    job: "Bring them back",
    color: BACK,
    title: "She orders again",
    body: "The next sale starts with another message.",
    says: "“Two bags of cold brew, please!”",
    icon: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
      </>
    ),
  },
];

const LAST = STEPS.length - 1;
const STEP_MS = 1500;
const HOLD_MS = 2600;
/* The rail's colour stops sit between the steps where the job changes: after "You answer"
   and after "She orders & pays". */
const RAIL = `${SUPPORT} 0 25%, ${SELL} 25% 42%, ${BACK} 42% 100%`;

function Star() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-ru-star-top" aria-hidden="true">
      <path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z" />
    </svg>
  );
}

/**
 * How RateUp works, as one customer's way through the three jobs. Olivia's marker rides the
 * rail and each step lights as she reaches it, then the loop starts over. The server and
 * reduced-motion readers get every step lit and nothing moving.
 */
export default function Journey() {
  const [at, setAt] = useState(LAST);
  const [offset, setOffset] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useIsomorphicLayoutEffect(() => {
    if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setAt(-1);
  }, []);

  // Starts the first time the track is on screen, then loops for as long as the page is open.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setTimeout>;
    let step = -1;
    const tick = () => {
      step = step >= LAST ? 0 : step + 1;
      setAt(step);
      timer = setTimeout(tick, step === LAST ? HOLD_MS : STEP_MS);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        timer = setTimeout(tick, 400);
      },
      { threshold: 0.35 },
    );
    io.observe(track);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // Measured rather than a share of the rail: stacked on a phone, the steps differ in height.
  useEffect(() => {
    const measure = () => {
      const rail = railRef.current?.getBoundingClientRect();
      const dot = dotRefs.current[Math.max(at, 0)]?.getBoundingClientRect();
      if (!rail || !dot) return;
      setOffset(
        rail.height > rail.width
          ? dot.top + dot.height / 2 - rail.top
          : dot.left + dot.width / 2 - rail.left,
      );
    };
    measure();
    addEventListener("resize", measure);
    return () => removeEventListener("resize", measure);
  }, [at]);

  const p = at < 0 || offset === null ? "0px" : `${offset}px`;
  const done = at === LAST;

  return (
    <section className="relative isolate overflow-hidden bg-[radial-gradient(700px_420px_at_50%_62%,rgba(46,104,168,0.42),transparent_72%),radial-gradient(600px_400px_at_0%_0%,rgba(90,140,198,0.18),transparent_70%),linear-gradient(160deg,var(--color-ru-blue-800),var(--color-ru-blue-900)_46%,var(--color-ru-blue-950))] px-5 py-14 text-white sm:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[repeating-radial-gradient(circle_at_110%_140%,transparent_0_58px,rgba(144,178,220,0.06)_59px_60px)]" />

      <div className="mx-auto mb-12 max-w-190 text-center sm:mb-16">
        <p className="mb-5.5 flex items-center justify-center gap-3 font-display text-[13px] font-bold tracking-[0.14em] text-ru-blue-300 uppercase sm:text-[14px]">
          <span className="h-px w-7 bg-linear-to-r from-transparent to-ru-blue-300/60 sm:w-16" />
          <Star />
          How RateUp works
          <Star />
          <span className="h-px w-7 bg-linear-to-l from-transparent to-ru-blue-300/60 sm:w-16" />
        </p>
        <h2 className="mb-4 font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance">
          One customer, from first message to <span className="text-[#4ade80]">next order.</span>
        </h2>
        <p className="text-[clamp(1.0625rem,2vw,1.25rem)]/[1.6] text-pretty text-white/72">
          Follow Olivia through Fern &amp; Field Coffee. Every step happens in the same chat.
        </p>
      </div>

      <div
        ref={trackRef}
        style={{ "--p": p } as CSSProperties}
        className="relative mx-auto max-w-105 lg:max-w-295"
      >
        <div
          ref={railRef}
          aria-hidden="true"
          className="absolute top-8.25 bottom-8.25 left-7.75 w-1 rounded-full bg-white/10 lg:top-7.75 lg:right-[calc(100%/14)] lg:bottom-auto lg:left-[calc(100%/14)] lg:h-1 lg:w-auto"
        >
          <div
            style={{ "--rail": RAIL } as CSSProperties}
            className="absolute inset-0 rounded-full bg-[linear-gradient(180deg,var(--rail))] shadow-[0_0_18px_rgba(144,178,220,0.35)] transition-[clip-path] duration-1100 ease-[cubic-bezier(0.6,0,0.2,1)] [clip-path:inset(0_0_calc(100%_-_var(--p))_0)] motion-reduce:transition-none lg:bg-[linear-gradient(90deg,var(--rail))] lg:[clip-path:inset(0_calc(100%_-_var(--p))_0_0)]"
          />
          <span
            className={`absolute top-(--p) left-1/2 z-10 -mt-4.25 -ml-4.25 flex size-8.5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d9467a,#f07b4f)] font-display text-[12px] font-extrabold text-white shadow-[0_0_0_3px_var(--color-ru-blue-900),0_8px_18px_rgba(0,0,0,0.5)] transition-[top,left,opacity] duration-1100 ease-[cubic-bezier(0.6,0,0.2,1)] motion-reduce:transition-none lg:top-1/2 lg:left-(--p) ${at < 0 ? "opacity-0" : ""}`}
          >
            OB
          </span>
        </div>

        <ol className="grid list-none gap-6.5 p-0 lg:grid-cols-7 lg:gap-0">
          {STEPS.map((step, i) => {
            const lit = i <= at;
            const now = i === at;
            return (
              <li
                key={step.title}
                style={{ "--c": step.color } as CSSProperties}
                className="relative grid grid-cols-[66px_1fr] items-start gap-x-4 lg:flex lg:flex-col lg:items-center lg:px-2 lg:text-center"
              >
                <span
                  ref={(el) => {
                    dotRefs.current[i] = el;
                  }}
                  className={`relative row-span-4 flex size-16.5 items-center justify-center rounded-full border-3 transition-all duration-500 motion-reduce:transition-none ${
                    lit
                      ? "border-(--c) bg-(--c) text-white shadow-[0_0_0_6px_color-mix(in_srgb,var(--c)_18%,transparent),0_12px_30px_-8px_var(--c)]"
                      : "border-white/14 bg-ru-blue-900 text-white/45"
                  } ${now ? "scale-108" : ""}`}
                >
                  {now && (
                    <span className="absolute -inset-2.25 animate-ping rounded-full border-2 border-(--c) opacity-60 [animation-duration:1.6s] motion-reduce:hidden" />
                  )}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-6"
                    aria-hidden="true"
                  >
                    {step.icon}
                  </svg>
                </span>
                <span
                  className={`mt-1 text-[11px]/none font-bold tracking-[0.1em] uppercase transition-colors duration-500 lg:mt-3.5 ${lit ? "text-(--c)" : "text-white/40"}`}
                >
                  {step.job}
                </span>
                <h3
                  className={`mt-2 mb-1.5 font-display text-[18px]/[1.2] font-bold transition-colors duration-500 ${lit ? "text-white" : "text-white/55"}`}
                >
                  {step.title}
                </h3>
                <p
                  className={`text-[14px]/[1.45] transition-colors duration-500 ${lit ? "text-white/72" : "text-white/45"}`}
                >
                  {step.body}
                </p>
                <span
                  className={`mt-3 justify-self-start rounded-[12px_12px_12px_4px] bg-white px-2.5 py-2 text-[12.5px]/[1.35] font-medium text-ru-n-700 shadow-[0_12px_26px_-12px_rgba(0,0,0,0.6)] transition-[opacity,transform] duration-450 ease-[cubic-bezier(0.2,0.9,0.3,1.3)] motion-reduce:transition-none lg:max-w-38 ${
                    lit ? "opacity-100" : "translate-y-2 scale-94 opacity-0"
                  }`}
                >
                  {step.says}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-9 flex justify-center">
        <span
          className={`inline-flex items-center gap-2.5 rounded-full border px-5 py-2.75 text-[14.5px] font-semibold text-white/80 transition-all duration-500 ${
            done
              ? "border-[#4ade80]/50 bg-[#22c55e]/14 shadow-[0_0_30px_-6px_rgba(34,197,94,0.6)]"
              : "border-white/14 bg-white/6"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4ade80"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4.5 flex-none"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          …and the loop starts again, without paying for another ad.
        </span>
      </div>
      <div className="mt-4.5 flex flex-wrap justify-center gap-4.5 text-[13px] font-semibold text-white/60">
        {[
          ["1 · Support", SUPPORT],
          ["2 · Sell", SELL],
          ["3 · Bring them back", BACK],
        ].map(([label, color]) => (
          <span key={label} className="inline-flex items-center gap-1.75">
            <span className="size-2.5 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

import type { ReactNode } from "react";

import { rateupIcon } from "@/utils/constants";

import { BookDemoCta, Eyebrow, WhatsAppCta } from "./home-ui";

interface Step {
  n: string;
  title: string;
  body: string;
  /** Where the node sits on the ring, as percentages of the square. */
  left: string;
  top: string;
  icon: ReactNode;
  tone?: "warm" | "accent";
}

const STEPS: Step[] = [
  {
    n: "01",
    title: "Purchase",
    body: "Order syncs from your store",
    left: "50%",
    top: "8%",
    icon: (
      <>
        <path d="M4 5h2l2.4 10.4a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.5L21 8H7" />
        <circle cx="10" cy="20" r="1.2" />
        <circle cx="18" cy="20" r="1.2" />
      </>
    ),
  },
  {
    n: "02",
    title: "Feedback",
    body: "One-tap rating on WhatsApp",
    left: "86.4%",
    top: "29%",
    icon: (
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
    ),
  },
  {
    n: "03",
    title: "Recovery",
    body: "Low scores routed to a human",
    left: "86.4%",
    top: "71%",
    icon: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  {
    n: "04",
    title: "Reward",
    body: "Points credited in the thread",
    left: "50%",
    top: "92%",
    tone: "warm",
    icon: null,
  },
  {
    n: "05",
    title: "Campaign",
    body: "The right offer to the right segment",
    left: "13.6%",
    top: "71%",
    icon: (
      <>
        <path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Z" />
        <path d="M14 8.5a4 4 0 0 1 0 7" />
        <path d="M17 5.5a8 8 0 0 1 0 13" />
      </>
    ),
  },
  {
    n: "06",
    title: "Repeat",
    body: "Next order, at no ad cost",
    left: "13.6%",
    top: "29%",
    tone: "accent",
    icon: (
      <>
        <path d="M21 12a9 9 0 1 1-3.2-6.9" />
        <path d="M21 3v6h-6" />
      </>
    ),
  },
];

function nodeDiscClasses(tone: Step["tone"]) {
  if (tone === "warm") return "border-ru-amber-200 bg-ru-amber-50";
  if (tone === "accent") return "border-ru-blue-200 bg-ru-blue-50 text-ru-blue-600";
  return "border-ru-n-200 bg-white text-ru-blue-600";
}

/**
 * The star takes 24s to travel the ring and the six nodes sit at exact 60deg intervals, so it
 * reaches node `i` at `i x 4s`. `ru-node-pop` runs on that same 24s clock, offset by each
 * node's arrival — less the 0.72s the pop takes to peak, so the disc is at full size as the
 * star crosses it rather than just after.
 */
const LAP_MS = 24_000;
const NODE_POP_PEAK_MS = 0.03 * LAP_MS;
const popDelay = (index: number) => ({
  animationDelay: `${(index * LAP_MS) / STEPS.length - NODE_POP_PEAK_MS}ms`,
});

function StepDisc({ step, popIndex }: Readonly<{ step: Step; popIndex?: number }>) {
  const pops = popIndex !== undefined;
  return (
    <span
      style={pops ? popDelay(popIndex) : undefined}
      className={`flex size-11 flex-none items-center justify-center rounded-full border shadow-sm ${
        pops ? "animate-ru-node-pop motion-reduce:animate-none" : ""
      } ${nodeDiscClasses(step.tone)}`}
    >
      {step.tone === "warm" ? (
        <img src={rateupIcon} alt="" className="size-5 object-contain" />
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={step.tone === "accent" ? "1.9" : "1.8"}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
          aria-hidden="true"
        >
          {step.icon}
        </svg>
      )}
    </span>
  );
}

function StepLabel({ step, centered }: Readonly<{ step: Step; centered?: boolean }>) {
  return (
    <div className={centered ? "text-center" : ""}>
      <div className="text-xs font-semibold tracking-widest text-ru-n-400">{step.n}</div>
      <div className="font-display text-base font-bold tracking-[-0.015em] text-ru-n-700">
        {step.title}
      </div>
      <div className="mt-0.5 text-[13px]/[1.35] text-ru-n-500">{step.body}</div>
    </div>
  );
}

function CentreStat() {
  return (
    <>
      <img src={rateupIcon} alt="" className="mb-2 h-auto w-5 sm:w-7" />
      <div className="font-display text-[clamp(1.75rem,5.2vw,2.875rem)]/none font-bold tracking-[-0.04em] text-ru-n-700">
        3×
      </div>
      <div className="mt-1.5 text-[clamp(0.8125rem,1.6vw,0.9375rem)] font-medium text-ru-n-600">
        repeat purchases
      </div>
      <div className="mt-1 text-[clamp(0.75rem,1.4vw,0.84375rem)] text-ru-n-400">
        from the same customer
      </div>
    </>
  );
}

export default function HowItWorks() {
  return (
    <section id="loop" className="border-b border-ru-n-100 bg-ink-25">
      <div className="mx-auto max-w-280 px-5 py-14 sm:py-26">
        <div className="mx-auto mb-6 max-w-160 text-center sm:mb-10">
          <Eyebrow
            className="mb-4.5"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="M20.5 12a8.5 8.5 0 0 1-14.6 5.9" />
                <path d="M3.5 12a8.5 8.5 0 0 1 14.6-5.9" />
                <path d="M18.1 2.6v3.5h-3.5" />
                <path d="M5.9 21.4v-3.5h3.5" />
              </svg>
            }
          >
            How RateUp works
          </Eyebrow>
          <h2 className="mb-4 font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance text-ru-n-700">
            One purchase. An automated relationship.
          </h2>
          <p className="text-[clamp(1.0625rem,2vw,1.25rem)]/[1.6] text-pretty text-ru-n-500">
            Six steps that run themselves, in a loop. Each turn is cheaper than the last, because
            the reward is funded by the order it creates.
          </p>
        </div>

        {/* The ring needs `md` to breathe, not `sm`. Its labels are a fixed 158px wide and sit
            at 86.4% of the square, so at the 640px breakpoint the right-hand pair clear the
            edge by under 3px — and `body { overflow-x: hidden }` (leaked from the homepage CSS
            module) would clip them rather than scroll. Below `md` the six steps read as a
            stepper instead. */}
        <ol className="mx-auto flex max-w-md flex-col gap-5 py-6 md:hidden">
          <li className="flex flex-col items-center gap-2 rounded-3xl border border-ru-n-200 bg-white px-6 py-7 text-center shadow-sm">
            <CentreStat />
          </li>
          {STEPS.map((step) => (
            <li key={step.n} className="flex items-start gap-3.5">
              <StepDisc step={step} />
              <StepLabel step={step} />
            </li>
          ))}
        </ol>

        {/* The bottom node's label hangs past the square, so the block reserves room for it. */}
        <div className="hidden py-6 md:block md:pt-10 md:pb-28">
          <div className="relative mx-auto aspect-square w-[min(100%,620px)]">
            {/* 8% inset puts the ring's radius at 0.42 of the square — exactly the radius the
                step coordinates below are plotted on, so the dashed line and the travelling
                star both pass through the centre of every disc rather than just inside them. */}
            <div className="absolute inset-[8%] rounded-full border-[1.5px] border-dashed border-ru-blue-200" />
            <div className="absolute inset-[8%] animate-ru-orbit motion-reduce:animate-none">
              <span className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full bg-ru-star shadow-[0_0_0_4px_rgba(248,149,29,0.16)]" />
            </div>

            <div className="absolute top-1/2 left-1/2 flex aspect-square w-[44%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-ru-n-200 bg-white p-[6%] text-center shadow-md">
              <CentreStat />
            </div>

            {/* Each step's coordinates are a point on the dashed ring, so the wrapper is sized
                to the disc alone and centred there — the disc sits on the orbit and breaks the
                line, the way the travelling star does. The label is taken out of flow beneath
                it, or it would drag the disc upward off the ring to centre the pair. */}
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                style={{ left: step.left, top: step.top }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
              >
                <StepDisc step={step} popIndex={i} />
                <div className="absolute top-full left-1/2 mt-2 w-39.5 -translate-x-1/2">
                  <StepLabel step={step} centered />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:mt-7">
          <BookDemoCta className="h-13 px-6.5 text-[16.5px] max-sm:w-full max-sm:justify-center">
            See the loop on your store
          </BookDemoCta>
          <WhatsAppCta className="h-13 px-5 text-[16.5px] max-sm:w-full max-sm:justify-center" />
        </div>
      </div>
    </section>
  );
}

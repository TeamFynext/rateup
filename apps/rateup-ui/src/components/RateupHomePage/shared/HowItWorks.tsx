import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { rateupIcon } from "@/utils/constants";

import { BOOK_DEMO_ROUTE } from "../helper/BookDemoLink";
import { ArrowRight, WhatsAppCta } from "./home-ui";

/**
 * Every colour in this section comes from the `[data-loop]` token block in `styles/foundation.css`
 * rather than from utility classes, because the redesign colours more than the six discs:
 * the band, the orbit wash, the type and the CTA all belong to the same set.
 */
interface Step {
  n: string;
  title: string;
  body: string;
  /** Where the node sits on the ring, as percentages of the square. */
  left: string;
  top: string;
  /** Which of the six `--lpN-*` triples paints this node. Matches the step number. */
  tone: 1 | 2 | 3 | 4 | 5 | 6;
  /** `"star"` swaps the stroked glyph for the brand mark, as the design does on Reward. */
  icon: ReactNode | "star";
}

const STEPS: Step[] = [
  {
    n: "01",
    title: "Purchase",
    body: "Order syncs from your store",
    left: "50%",
    top: "8%",
    tone: 1,
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
    tone: 2,
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
    tone: 3,
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
    tone: 4,
    icon: "star",
  },
  {
    n: "05",
    title: "Campaign",
    body: "The right offer to the right segment",
    left: "13.6%",
    top: "71%",
    tone: 5,
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
    tone: 6,
    icon: (
      <>
        <path d="M21 12a9 9 0 1 1-3.2-6.9" />
        <path d="M21 3v6h-6" />
      </>
    ),
  },
];

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
      style={{
        background: `var(--lp${step.tone}-bg)`,
        borderColor: `var(--lp${step.tone}-bd)`,
        color: `var(--lp${step.tone}-ink)`,
        boxShadow: "var(--lp-node-sh)",
        ...(pops ? popDelay(popIndex) : {}),
      }}
      className={`flex size-[clamp(46px,5.6vw,56px)] flex-none items-center justify-center rounded-full border-[1.5px] ${
        pops ? "animate-ru-node-pop motion-reduce:animate-none" : ""
      }`}
    >
      {step.icon === "star" ? (
        <img
          src={rateupIcon}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-5 object-contain"
        />
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
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
      <div
        style={{ color: `var(--lp${step.tone}-ink)` }}
        className="text-xs font-semibold tracking-widest"
      >
        {step.n}
      </div>
      <div
        style={{ color: "var(--lp-fg)" }}
        className="font-display text-base font-bold tracking-[-0.015em]"
      >
        {step.title}
      </div>
      <div style={{ color: "var(--lp-fg3)" }} className="mt-0.5 text-[13px]/[1.35]">
        {step.body}
      </div>
    </div>
  );
}

function CentreStat() {
  return (
    <>
      <img
        src={rateupIcon}
        alt=""
        loading="lazy"
        decoding="async"
        className="mb-2 h-auto w-5 sm:w-7"
      />
      <div
        style={{ color: "var(--lp-fg)" }}
        className="font-display text-[clamp(1.75rem,5.2vw,2.875rem)]/none font-bold tracking-[-0.04em]"
      >
        3×
      </div>
      <div
        style={{ color: "var(--lp-fg2)" }}
        className="mt-1.5 text-[clamp(0.8125rem,1.6vw,0.9375rem)] font-medium"
      >
        repeat purchases
      </div>
      <div
        style={{ color: "var(--lp-num)" }}
        className="mt-1 text-[clamp(0.75rem,1.4vw,0.84375rem)]"
      >
        from the same customer
      </div>
    </>
  );
}

/* The shared `Eyebrow` is hardcoded to the blue ramp. This section runs on its own palette,
   so it needs one whose three surfaces — pill, inner disc and label — follow the loop tokens. */
function LoopEyebrow({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      style={{ background: "var(--lp-eb-bg)", borderColor: "var(--lp-eb-bd)" }}
      className="mb-4.5 inline-flex items-center gap-2.5 rounded-full border py-2 pr-4 pl-2.5"
    >
      <span
        style={{
          background: "var(--lp-hub-bg)",
          borderColor: "var(--lp-eb-bd)",
          color: "var(--lp-eb-ink)",
        }}
        className="flex size-7 flex-none items-center justify-center rounded-full border"
      >
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
      </span>
      <span
        style={{ color: "var(--lp-eb-ink)" }}
        className="text-[13px] font-semibold tracking-[0.09em] uppercase"
      >
        {children}
      </span>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section
      id="loop"
      data-loop=""
      style={{ background: "var(--lp-bg)", borderBottomColor: "var(--lp-edge)" }}
      className="border-b"
    >
      <div className="mx-auto max-w-280 px-5 py-14 sm:py-26">
        <div className="mx-auto mb-6 max-w-160 text-center sm:mb-10">
          <LoopEyebrow>How RateUp works</LoopEyebrow>
          <h2
            style={{ color: "var(--lp-fg)" }}
            className="mb-4 font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance"
          >
            One purchase. An automated relationship.
          </h2>
          <p
            style={{ color: "var(--lp-fg3)" }}
            className="text-[clamp(1.0625rem,2vw,1.25rem)]/[1.6] text-pretty"
          >
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
          <li
            style={{
              background: "var(--lp-hub-bg)",
              borderColor: "var(--lp-hub-bd)",
              boxShadow: "var(--lp-hub-sh)",
            }}
            className="flex flex-col items-center gap-2 rounded-3xl border px-6 py-7 text-center"
          >
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
                star both pass through the centre of every disc rather than just inside them.
                The conic wash sits inside the same circle, tinting the field the nodes ride. */}
            <div
              style={{ borderColor: "var(--lp-ring)", background: "var(--lp-ring-fill)" }}
              className="absolute inset-[8%] rounded-full border-[1.5px] border-dashed"
            />
            <div className="absolute inset-[8%] animate-ru-orbit motion-reduce:animate-none">
              <span
                style={{
                  background: "var(--lp-dot)",
                  boxShadow: "0 0 0 5px var(--lp-dot-ring)",
                }}
                className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full"
              />
            </div>

            <div
              style={{
                background: "var(--lp-hub-bg)",
                borderColor: "var(--lp-hub-bd)",
                boxShadow: "var(--lp-hub-sh)",
              }}
              className="absolute top-1/2 left-1/2 flex aspect-square w-[44%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border p-[6%] text-center"
            >
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
          {/* Not `BookDemoCta`: the design draws this button from the loop's own palette, and
              the shared one is fixed to the blue ramp. */}
          <Link
            to={BOOK_DEMO_ROUTE}
            style={{ background: "var(--lp-cta-bg)", color: "var(--lp-cta-ink)" }}
            className="inline-flex h-13 items-center gap-2.5 rounded-lg px-6.5 text-[16.5px] font-semibold shadow-[0_8px_22px_rgba(9,23,41,0.18)] transition-[filter,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-px hover:brightness-110 max-sm:w-full max-sm:justify-center"
          >
            See the loop on your store
            <ArrowRight />
          </Link>
          <WhatsAppCta className="h-13 px-5 text-[16.5px] max-sm:w-full max-sm:justify-center" />
        </div>
      </div>
    </section>
  );
}

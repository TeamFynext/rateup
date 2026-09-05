import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { RateupStar } from "@/components/integrations/logos";
import { BOOK_DEMO_ROUTE } from "@/components/RateupHomePage/helper/BookDemoLink";

import { LOYALTY_STEPS } from "./content";

const ICONS: readonly ReactNode[] = [
  <path
    key="wa"
    d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z"
  />,
  null, // step 02 uses the RateUp star rather than a stroked glyph
  <g key="cart">
    <path d="M4 5h2l2.4 10.4a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.5L21 8H7" />
    <circle cx="10" cy="20" r="1.2" />
    <circle cx="18" cy="20" r="1.2" />
  </g>,
  <g key="loop">
    <path d="M21 12a9 9 0 1 1-3.2-6.9" />
    <path d="M21 3v6h-6" />
  </g>,
];

export default function HowItWorks() {
  return (
    <section id="how" className="border-b border-ru-n-100 bg-ru-n-50 py-[clamp(3.5rem,8vw,6.5rem)]">
      <div className="mx-auto max-w-290 px-5">
        <div className="mx-auto mb-[clamp(2rem,4vw,3rem)] max-w-165 text-center">
          <div className="mb-3.5 text-[12.5px] font-semibold tracking-[0.1em] text-ru-blue-500 uppercase">
            How it works
          </div>
          <h2 className="mb-4 font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance text-ru-n-700">
            Live on your own number in an afternoon.
          </h2>
          <p className="text-[clamp(1.0625rem,2vw,1.25rem)]/[1.6] text-pretty text-ru-n-500">
            Four steps, no developers. Your customers never leave the thread they're already in.
          </p>
        </div>

        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LOYALTY_STEPS.map((step, index) => (
            <li
              key={step.n}
              className="flex flex-col gap-3 rounded-2xl border border-ru-n-200 bg-white p-6.5 transition-all hover:-translate-y-0.5 hover:border-ru-n-300 hover:shadow-md"
            >
              <span
                className={`flex size-9.5 flex-none items-center justify-center rounded-[10px] border ${
                  step.tone === "warm"
                    ? "border-ru-amber-200 bg-ru-amber-50"
                    : "border-ru-blue-200 bg-ru-blue-50 text-ru-blue-600"
                }`}
              >
                {step.tone === "warm" ? (
                  <RateupStar className="size-4.75" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4.75"
                    aria-hidden="true"
                  >
                    {ICONS[index]}
                  </svg>
                )}
              </span>
              <div className="text-xs font-semibold tracking-[0.1em] text-ru-n-400">{step.n}</div>
              <h3 className="font-display text-[19px] font-bold tracking-[-0.018em] text-ru-n-700">
                {step.title}
              </h3>
              <p className="text-[15.5px]/[1.55] text-ru-n-500">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-[clamp(1.75rem,4vw,2.5rem)] flex justify-center">
          <Link
            to={BOOK_DEMO_ROUTE}
            className="inline-flex h-13 items-center gap-2.25 rounded-lg bg-ru-blue-600 px-6.5 text-[16.5px] font-semibold text-white shadow-[0_8px_22px_rgba(28,81,142,0.18)] transition-colors hover:bg-ru-blue-700"
          >
            Book a Demo
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 flex-none"
              aria-hidden="true"
            >
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

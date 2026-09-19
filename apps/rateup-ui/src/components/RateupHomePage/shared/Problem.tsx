import type { ReactNode } from "react";

import { BookDemoCta, CountUp, Eyebrow, useReveal, WhatsAppCta } from "./home-ui";

interface Pain {
  icon: ReactNode;
  title: string;
  body: string;
  stat: string;
  statLabel: string;
}

const PAINS: Pain[] = [
  {
    icon: (
      <path d="M12 2v20M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.6 7 6.5s2 2.8 5 3.5 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3" />
    ),
    title: "You pay twice for the same customer",
    body: "Ad costs climb every quarter while the buyers you already paid for sit idle in a spreadsheet.",
    stat: "71%",
    statLabel: "send no follow-ups",
  },
  {
    icon: (
      <>
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
        <path d="M9 14s1 1 3 1 3-1 3-1" />
      </>
    ),
    title: "Unhappy customers leave without a word",
    body: "One bad delivery and they're gone. You find out months later, from a revenue chart.",
    stat: "68%",
    statLabel: "never return",
  },
  {
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.6" />
        <rect x="14" y="3" width="7" height="7" rx="1.6" />
        <rect x="3" y="14" width="7" height="7" rx="1.6" />
        <path d="M14 17.5h7M17.5 14v7" />
      </>
    ),
    title: "Five tools that don't talk to each other",
    body: "Reviews here, coupons there, chat somewhere else. Nobody owns the customer record.",
    stat: "52%",
    statLabel: "are silent churners",
  },
  {
    icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    title: "No visibility into customer sentiment",
    body: "You can't fix what nobody measures. Ratings sit in inboxes instead of dashboards.",
    stat: "72%",
    statLabel: "of issues unresolved",
  },
];

export default function Problem() {
  /* The four cards deal one after another as the row scrolls in, and each stat counts up to
     its figure. Restrained on purpose — this band is the bad news, so it should land rather
     than perform. */
  const [cardsRef, shown] = useReveal<HTMLDivElement>(0.2);

  return (
    <section className="border-b border-ru-n-100 bg-ru-n-50">
      <div className="mx-auto max-w-280 px-5 py-14 sm:py-26">
        <div className="mb-8 max-w-170 sm:mb-12">
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
                <path d="M12 3 2.5 20h19L12 3Z" />
                <path d="M12 10v4" />
                <path d="M12 17.2v.1" />
              </svg>
            }
          >
            The problem
          </Eyebrow>
          <h2 className="mb-4 font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance text-ru-n-700">
            Your business goes silent the moment someone buys.
          </h2>
          <p className="text-[clamp(1.0625rem,2vw,1.25rem)]/[1.6] text-pretty text-ru-n-500">
            The order confirmation is the last thing most brands ever send. Everything after it —
            the feedback, the fix, the reward, the second order — never happens.
          </p>
        </div>

        <div ref={cardsRef} className="flex flex-wrap gap-4">
          {PAINS.map((pain, i) => (
            <div
              key={pain.title}
              style={{ animationDelay: `${i * 110}ms` }}
              className={`relative flex flex-[1_1_250px] flex-col gap-3 overflow-hidden rounded-2xl border border-ru-n-200 bg-white p-6.5 transition-all before:absolute before:inset-x-0 before:top-0 before:h-0.75 before:origin-left before:scale-x-0 before:bg-ru-star before:transition-transform before:duration-500 hover:before:scale-x-100 motion-reduce:before:transition-none hover:-translate-y-0.5 hover:border-ru-n-300 hover:shadow-md motion-reduce:animate-none ${
                shown ? "animate-ru-rise" : "opacity-0"
              }`}
            >
              <span className="flex size-9.5 items-center justify-center rounded-[10px] border border-ru-n-200 bg-ru-n-50 text-ru-blue-600">
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
                  {pain.icon}
                </svg>
              </span>
              <div className="font-display text-[19px] font-bold tracking-[-0.018em] text-ru-n-700">
                {pain.title}
              </div>
              <p className="text-[15.5px]/[1.55] text-ru-n-500">{pain.body}</p>
              <span className="mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-ru-amber-200 bg-ru-amber-50 px-2.75 py-1.5">
                <strong className="font-display text-[15px] font-bold text-ru-amber-700">
                  <CountUp value={pain.stat} durationMs={1000} />
                </strong>
                <span className="text-[13.5px] text-ru-amber-700">{pain.statLabel}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-4.5 rounded-2xl border border-ru-n-200 bg-white p-5 shadow-sm sm:mt-10 sm:p-7">
          <div className="min-w-0 flex-[1_1_280px]">
            <div className="font-display text-[clamp(1.1875rem,2.4vw,1.4375rem)] font-bold tracking-[-0.02em] text-ru-n-700">
              Every silent customer is revenue you already paid for.
            </div>
            <div className="mt-1.25 text-[15px] text-ru-n-500">
              See what RateUp would send to your last 100 orders.
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2.5 sm:w-auto sm:flex-none">
            <BookDemoCta
              showArrow={false}
              className="h-12 px-5.5 text-base max-sm:w-full max-sm:justify-center"
            />
            <WhatsAppCta className="h-12 px-4.5 text-base max-sm:w-full max-sm:justify-center">
              WhatsApp us
            </WhatsAppCta>
          </div>
        </div>
      </div>
    </section>
  );
}

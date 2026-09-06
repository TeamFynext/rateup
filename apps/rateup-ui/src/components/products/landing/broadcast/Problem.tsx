import type { ReactNode } from "react";

/**
 * "The problem" band — why the free app's broadcast list is not a business tool — closing on a
 * green strip that states what the official API gives you instead.
 */

interface Problem {
  title: string;
  body: string;
  /** Tile colour. The severity ramp is deliberate: neutral, error, warning. */
  tile: string;
  icon: ReactNode;
}

const PROBLEMS: readonly Problem[] = [
  {
    title: "256 contacts per list, and only people who saved your number receive it",
    body: "Every campaign becomes a manual splitting exercise, and most of your list silently never gets the message.",
    tile: "border-ru-blue-200 bg-ru-blue-50 text-ru-blue-600",
    icon: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    title: "Unofficial bulk senders get numbers banned permanently",
    body: "A modded client or a grey-market panel violates Meta's terms. When the ban lands, the number and its chat history are gone.",
    tile: "border-red-200 bg-red-50 text-destructive dark:border-red-900/40 dark:bg-red-950/30",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m4.9 4.9 14.2 14.2" />
      </>
    ),
  },
  {
    title: "No delivery report, no scheduling, no team",
    body: "You cannot prove what was delivered, cannot queue a festive send for 9am, and cannot let two marketers work the same list.",
    tile: "border-ru-amber-200 bg-ru-amber-50 text-ru-amber-700",
    icon: (
      <>
        <path d="M3 3v18h18" />
        <path d="M18 17V9" />
        <path d="M13 17V5" />
        <path d="M8 17v3" />
      </>
    ),
  },
];

export default function Problem() {
  return (
    <section className="py-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto flex max-w-280 flex-col gap-9 px-5">
        <div className="flex flex-col gap-3.5">
          <span className="text-[11.5px] font-semibold tracking-[0.1em] text-ru-blue-500 uppercase">
            The problem
          </span>
          <h2 className="max-w-[26ch] font-display text-[clamp(1.625rem,3.6vw,2.25rem)]/[1.12] font-bold tracking-[-0.028em] text-pretty text-ru-n-700">
            The WhatsApp Business App broadcast list was never built for a business.
          </h2>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
          {PROBLEMS.map((problem) => (
            <div
              key={problem.title}
              className="flex flex-col gap-3.5 rounded-xl bg-white p-8 shadow-xs ring-1 ring-ru-n-200 ring-inset"
            >
              <span
                className={`flex size-10 items-center justify-center rounded-lg border ${problem.tile}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5"
                  aria-hidden="true"
                >
                  {problem.icon}
                </svg>
              </span>
              <h3 className="font-display text-base/[1.35] font-medium tracking-[-0.01em] text-ru-n-700">
                {problem.title}
              </h3>
              <p className="text-sm/[1.6] text-ru-n-500">{problem.body}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4.5 rounded-2xl border border-ru-green-100 bg-ru-green-50 px-7 py-6">
          <span className="flex size-10 flex-none items-center justify-center rounded-lg border border-ru-green-100 bg-white text-ru-green-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
              aria-hidden="true"
            >
              <path d="M18 6 7 17l-5-5" />
              <path d="m22 10-7.5 7.5L13 16" />
            </svg>
          </span>
          <p className="text-base/[1.55] font-medium text-pretty text-ru-green-700">
            Broadcasts on the official API: unlimited recipients, verified name, template approval,
            delivery receipts.
          </p>
        </div>
      </div>
    </section>
  );
}

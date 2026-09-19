import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { LIFECYCLE_STEPS } from "./content";
import { BAND, Glyph, SectionHead } from "./parts";

/** How long each step holds. The progress bar's duration is set from this same number. */
const DWELL_MS = 4000;

const ICONS: readonly ReactNode[] = [
  <path
    key="0"
    d="M20.5 12c0 4-3.8 7-8.5 7-1 0-2-.15-2.9-.4L4 20l1.3-3.6A6.9 6.9 0 0 1 3.5 12c0-4 3.8-7 8.5-7s8.5 3 8.5 7Z"
  />,
  <path
    key="1"
    d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8ZM10 6v12"
  />,
  <>
    <circle cx="10" cy="8" r="3.4" />
    <path d="M3.5 20a6.5 6.5 0 0 1 13 0M18 8v6M15 11h6" />
  </>,
  <path key="3" d="M5 4.5h14v11H11l-4 4v-4H5v-11ZM9 9h6M9 12h4" />,
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12.2 2.4 2.4 4.6-5" />
  </>,
];

export default function Lifecycle() {
  const ref = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);
  const [onScreen, setOnScreen] = useState(false);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      threshold: 0.3,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = onScreen && !held;

  /* `active` is a dependency so a manual pick restarts the dwell rather than cutting it short. */
  useEffect(() => {
    if (!running) return;
    const id = globalThis.setTimeout(
      () => setActive((i) => (i + 1) % LIFECYCLE_STEPS.length),
      DWELL_MS,
    );
    return () => globalThis.clearTimeout(id);
  }, [running, active]);

  return (
    <section className="border-y border-ru-n-100 bg-ru-n-50">
      <div className={BAND}>
        <SectionHead
          eyebrow="Message to result"
          icon={<path d="M4 12h13M13 6l6 6-6 6" />}
          title="From message to result, in five steps."
        >
          The same path for every message, on every channel — so “what happened with that customer?”
          always has an answer.
        </SectionHead>

        <ol
          ref={ref}
          onMouseEnter={() => setHeld(true)}
          onMouseLeave={() => setHeld(false)}
          onFocusCapture={() => setHeld(true)}
          onBlurCapture={() => setHeld(false)}
          className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-5"
        >
          {LIFECYCLE_STEPS.map((step, i) => {
            const on = active === i;
            return (
              <li key={step.title} className="min-w-0">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setActive(i)}
                  className={`relative flex h-full w-full cursor-pointer flex-col gap-2.5 overflow-hidden rounded-2xl border bg-white p-5 text-left transition-all duration-300 motion-reduce:transition-none ${
                    on
                      ? "-translate-y-1 border-ru-blue-600 shadow-md"
                      : "border-ru-n-200 hover:border-ru-n-300"
                  }`}
                >
                  {on && running && (
                    <span
                      aria-hidden="true"
                      style={{ animationDuration: `${DWELL_MS}ms` }}
                      className="absolute inset-x-0 top-0 h-0.5 origin-left animate-ru-progress bg-ru-blue-600"
                    />
                  )}
                  <span className="flex items-center justify-between">
                    <span
                      className={`flex size-10 items-center justify-center rounded-[10px] border transition-colors ${
                        on
                          ? "border-ru-blue-600 bg-ru-blue-600 text-white"
                          : "border-ru-blue-200 bg-ru-blue-50 text-ru-blue-600"
                      }`}
                    >
                      <Glyph>{ICONS[i]}</Glyph>
                    </span>
                    <span className="font-mono text-[12.5px] font-semibold text-ru-n-400">
                      0{i + 1}
                    </span>
                  </span>
                  <span className="font-display text-[17px] font-bold tracking-[-0.015em] text-ru-n-700">
                    {step.title}
                  </span>
                  <span className="text-[14.5px]/[1.5] text-ru-n-500">{step.body}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

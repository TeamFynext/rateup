import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { BAND, Glyph, SectionHead } from "./section";

/** How long each step holds. The progress bar's duration is set from this same number. */
const DWELL_MS = 4000;

export interface Step {
  title: string;
  body: string;
  icon: ReactNode;
}

/* Literal class names, so Tailwind's scan sees every one. */
const COLUMNS: Record<number, string> = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-3",
};

/** A numbered run of steps that advances on its own while on screen and holds on hover or focus. */
export default function Stepper({
  eyebrow,
  eyebrowIcon,
  title,
  lead,
  steps,
}: Readonly<{
  eyebrow: string;
  eyebrowIcon: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  steps: readonly Step[];
}>) {
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
    const id = globalThis.setTimeout(() => setActive((i) => (i + 1) % steps.length), DWELL_MS);
    return () => globalThis.clearTimeout(id);
  }, [running, active, steps.length]);

  return (
    <section className="border-y border-ru-n-100 bg-ru-n-50">
      <div className={BAND}>
        <SectionHead eyebrow={eyebrow} icon={eyebrowIcon} title={title}>
          {lead}
        </SectionHead>

        <ol
          ref={ref}
          onMouseEnter={() => setHeld(true)}
          onMouseLeave={() => setHeld(false)}
          onFocusCapture={() => setHeld(true)}
          onBlurCapture={() => setHeld(false)}
          className={`grid list-none gap-3 p-0 sm:grid-cols-2 ${COLUMNS[steps.length] ?? "lg:grid-cols-4"}`}
        >
          {steps.map((step, i) => {
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
                      <Glyph>{step.icon}</Glyph>
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

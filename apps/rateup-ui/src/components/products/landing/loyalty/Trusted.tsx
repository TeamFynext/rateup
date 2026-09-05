import { useState } from "react";

import { imagesPath } from "@/utils/constants";

import { LOYALTY_STATS, TESTIMONIALS, initials } from "./content";

/**
 * The customers band: a logo marquee, a two-up testimonial carousel and the headline figures.
 *
 * The design draws the marquee as grey wordmarks and notes that real logos drop straight in, so
 * this uses the client marks the homepage already carries. The quotes and figures are the ones
 * this page already published.
 */

const LOGOS = Array.from({ length: 14 }, (_, i) => `${imagesPath}/homepage/CLIENTS/${i + 1}.png`);

/**
 * Five stars. The design draws them as 14px gradient *squares* (`.stars i { border-radius: 2px }`)
 * — a placeholder shape, like its grey wordmarks; five amber squares on a review card read as a
 * rendering fault. Same size and colour, actual star.
 */
function Stars() {
  return (
    <div className="mb-4 flex gap-0.75" aria-label="Five out of five stars">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" className="size-3.5 fill-ru-amber-500" aria-hidden="true">
          <path d="M12 2l2.9 6.3 6.9.8-5.1 4.6 1.4 6.8L12 17.1 5.9 20.5l1.4-6.8L2.2 9.1l6.9-.8L12 2Z" />
        </svg>
      ))}
    </div>
  );
}

export default function Trusted() {
  const [pointer, setPointer] = useState(0);
  const shown = [
    TESTIMONIALS[pointer % TESTIMONIALS.length],
    TESTIMONIALS[(pointer + 1) % TESTIMONIALS.length],
  ];

  return (
    <section id="trusted" className="border-b border-ru-n-100 py-[clamp(3.5rem,8vw,6.5rem)]">
      <div className="mx-auto max-w-290 px-5">
        <div className="mx-auto mb-[clamp(2rem,4vw,3rem)] max-w-165 text-center">
          <div className="mb-3.5 text-[12.5px] font-semibold tracking-[0.1em] text-ru-blue-500 uppercase">
            Customers
          </div>
          <h2 className="mb-4 font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance text-ru-n-700">
            Trusted by growing businesses.
          </h2>
          <p className="text-[clamp(1.0625rem,2vw,1.25rem)]/[1.6] text-pretty text-ru-n-500">
            100+ ecommerce and retail brands run their loyalty on RateUp.
          </p>
        </div>

        <div className="mb-[clamp(2rem,4vw,2.75rem)] overflow-hidden mask-[linear-gradient(90deg,transparent,#000_7%,#000_93%,transparent)]">
          {/* Two copies of the rail, so the -50% lap in `ru-marquee` is seamless. */}
          <div className="flex w-max animate-ru-marquee items-center gap-[clamp(2rem,5vw,3.75rem)] motion-reduce:animate-none">
            {[...LOGOS, ...LOGOS].map((logo, i) => (
              <img
                key={i}
                src={logo}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-9 w-auto flex-none object-contain opacity-50 grayscale"
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {shown.map((testimonial) => (
            <figure
              key={testimonial.name}
              className="flex flex-col rounded-2xl border border-ru-n-200 bg-white p-7"
            >
              <span className="mb-4 inline-flex w-fit items-center gap-1.75 rounded-full border border-ru-amber-200 bg-ru-amber-50 py-1.25 pr-2.75 pl-1.25 text-[13px] font-semibold text-ru-amber-700">
                <span className="size-4 flex-none rounded-full bg-ru-star" />
                {testimonial.badge}
              </span>
              <Stars />
              <blockquote className="mb-5 font-display text-[19px]/[1.45] font-medium tracking-[-0.018em] text-pretty text-ru-n-700">
                “{testimonial.quote}”
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-2.75">
                <span
                  style={{ background: testimonial.colour }}
                  className="flex size-9.5 flex-none items-center justify-center rounded-full text-[13px] font-semibold text-white"
                >
                  {initials(testimonial.name)}
                </span>
                <div>
                  <div className="text-[15px] font-medium text-ru-n-700">{testimonial.name}</div>
                  <div className="text-[13.5px] text-ru-n-400">{testimonial.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-6 flex justify-center gap-2.5">
          {[
            { label: "Previous testimonials", delta: -1, path: "m15 18-6-6 6-6" },
            { label: "Next testimonials", delta: 1, path: "m9 18 6-6-6-6" },
          ].map((button) => (
            <button
              key={button.label}
              type="button"
              aria-label={button.label}
              onClick={() =>
                setPointer((p) => (p + button.delta + TESTIMONIALS.length) % TESTIMONIALS.length)
              }
              className="flex size-11.5 cursor-pointer items-center justify-center rounded-full border border-ru-n-200 bg-white text-ru-n-600 transition-colors hover:border-ru-n-300 hover:text-ru-blue-600"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4.75"
                aria-hidden="true"
              >
                <path d={button.path} />
              </svg>
            </button>
          ))}
        </div>

        <div className="mt-[clamp(2rem,4vw,2.75rem)] grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-px overflow-hidden rounded-2xl border border-ru-n-200 bg-ru-n-200">
          {LOYALTY_STATS.map((stat) => (
            <div key={stat.label} className="bg-white p-[clamp(1.125rem,2.6vw,1.625rem)]">
              <div
                className={`font-display text-[clamp(1.875rem,4.2vw,2.75rem)]/none font-bold tracking-[-0.035em] tabular-nums ${
                  "warm" in stat && stat.warm ? "text-ru-amber-700" : "text-ru-n-700"
                }`}
              >
                {stat.value}
              </div>
              <div className="mt-2 text-[14.5px] text-ru-n-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

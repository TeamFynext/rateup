import { Image } from "@unpic/react";

import { imagesPath } from "@/utils/constants";

import { CountUp } from "./home-ui";

const logos = Array.from({ length: 14 }, (_, i) => `${imagesPath}/homepage/CLIENTS/${i + 1}.png`);

/**
 * Headline numbers. These are the figures the site already claimed — the design's comp
 * carried its own placeholders, so the labels follow the design and the values stay put.
 */
const METRICS = [
  { value: "100+", label: "Active clients" },
  { value: "3×", label: "Engagement vs. email" },
  { value: "+30%", label: "Retention lift", warm: true },
  { value: "−65%", label: "Less manual effort" },
];

export default function TrustedBy() {
  return (
    <section id="trusted" className="border-y border-ru-n-100 bg-white">
      <div className="mx-auto max-w-280 px-5 py-9 sm:py-14">
        <p className="mx-auto mb-6 text-center font-display text-[clamp(1.25rem,2.4vw,1.6875rem)]/[1.35] font-medium tracking-[-0.02em] text-balance text-ru-n-600 sm:mb-8.5">
          Trusted by <strong className="font-bold text-ru-n-700">100+ ecommerce brands</strong>{" "}
          across <strong className="font-bold text-ru-n-700">30+ countries</strong>
        </p>

        <div className="mb-8 overflow-hidden py-1 mask-[linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)] sm:mb-11">
          {/* Two copies of the rail, so the -50% lap in `ru-marquee` is seamless. */}
          <div className="flex w-max animate-ru-marquee items-stretch gap-3.5 pr-3.5 hover:paused motion-reduce:animate-none">
            {[...logos, ...logos].map((logo, i) => (
              <div
                key={i}
                className="flex h-19.5 min-w-47.5 items-center justify-center rounded-xl border border-ru-n-200 bg-ru-n-50 px-6.5 transition-all hover:-translate-y-0.5 hover:border-ru-amber-700 hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)]"
              >
                {/* 48px tall inside a 78px tile. The widest mark in the set is 2.05:1, so it
                    renders 98px across — inside the tile's 138px content box, which is what
                    keeps every card at its 190px minimum instead of stretching to fit. */}
                <Image
                  src={logo}
                  width={144}
                  height={48}
                  alt=""
                  className="h-12 w-auto object-contain opacity-55 grayscale transition-opacity hover:opacity-90"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(148px,1fr))] gap-px overflow-hidden rounded-2xl border border-ru-n-200 bg-ru-n-200">
          {METRICS.map((m) => (
            <div key={m.label} className="bg-white p-4.5 sm:p-6.5">
              <div
                className={`font-display text-[clamp(1.875rem,4.2vw,2.75rem)]/none font-bold tracking-[-0.035em] ${
                  m.warm ? "text-ru-amber-700" : "text-ru-n-700"
                }`}
              >
                <CountUp value={m.value} />
              </div>
              <div className="mt-2 text-[14.5px] text-ru-n-500">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

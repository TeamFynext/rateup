import { CountUp, useReveal } from "@/components/RateupHomePage/shared/home-ui";

import { BAND, SectionHead } from "../shared/section";
import { QUESTION_AVERAGES, RESULT_TILES } from "./content";

const card = "rounded-2xl border border-ru-n-200 bg-white p-5.5 sm:p-7";

export default function Results() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <section id="results" className="border-y border-ru-n-100 bg-ru-n-50">
      <div className={BAND}>
        <SectionHead
          eyebrow="Results"
          icon={<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />}
          title="Every ask, every answer, in one place."
        >
          How many were asked and answered, how many were happy, how many tapped through to Google,
          and the average for every question.
        </SectionHead>

        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {RESULT_TILES.map((tile) => (
            <div key={tile.label} className={card}>
              <div className="font-display text-[clamp(1.75rem,3.6vw,2.375rem)]/none font-bold tracking-[-0.03em] text-ru-n-700">
                <CountUp value={tile.value} />
              </div>
              <div className="mt-2 text-[14.5px] text-ru-n-500">{tile.label}</div>
            </div>
          ))}
        </div>

        <div className={card}>
          <h3 className="font-display text-[18px] font-bold tracking-[-0.018em] text-ru-n-700">
            Question averages
          </h3>
          <p className="mb-5 text-[13.5px] text-ru-n-400">Out of 5 · last 30 days</p>
          <div ref={ref} className="flex flex-col gap-3.5">
            {QUESTION_AVERAGES.map((row, i) => (
              <div
                key={row.question}
                className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3"
              >
                <span className="truncate text-[14px] text-ru-n-600">{row.question}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-ru-amber-100">
                  <span
                    style={{ transitionDelay: `${i * 120}ms` }}
                    className={`block h-full origin-left rounded-full bg-ru-amber-400 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${row.width} ${
                      shown ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </span>
                <span className="text-right text-[14px] font-semibold text-ru-n-700 tabular-nums">
                  {row.average.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-[13px] text-ru-n-400">Sample data.</p>
      </div>
    </section>
  );
}

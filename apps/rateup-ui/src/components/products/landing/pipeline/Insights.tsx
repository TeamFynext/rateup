import { CountUp, useReveal } from "@/components/RateupHomePage/shared/home-ui";

import { BAND, SectionHead } from "../shared/section";
import { FORECAST, FUNNEL, INSIGHT_TILES, SOURCES } from "./content";

const card = "rounded-2xl border border-ru-n-200 bg-white p-5.5 sm:p-7";
const cardTitle = "font-display text-[18px] font-bold tracking-[-0.018em] text-ru-n-700";
const grow =
  "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

export default function Insights() {
  const [funnelRef, funnelShown] = useReveal<HTMLDivElement>();
  const [forecastRef, forecastShown] = useReveal<HTMLDivElement>();

  return (
    <section id="insights" className="bg-white">
      <div className={BAND}>
        <SectionHead
          eyebrow="Insights & forecast"
          icon={<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />}
          title="See where leads stall, and what's likely to close."
        >
          A funnel by stage, time in stage, leads by source and team, and a forecast of expected
          wins by close month.
        </SectionHead>

        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          {INSIGHT_TILES.map((tile) => (
            <div key={tile.label} className={card}>
              <div className="font-display text-[clamp(1.75rem,3.6vw,2.375rem)]/none font-bold tracking-[-0.03em] text-ru-n-700">
                <CountUp value={tile.value} />
              </div>
              <div className="mt-2 text-[14.5px] text-ru-n-500">{tile.label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div className={`${card} min-w-0`}>
            <h3 className={cardTitle}>Open leads by stage</h3>
            <p className="mb-5 text-[13.5px] text-ru-n-400">Leads board</p>
            <div ref={funnelRef} className="flex flex-col gap-3">
              {FUNNEL.map((row, i) => (
                <div
                  key={row.stage}
                  className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3"
                >
                  <span className="truncate text-[13.5px] text-ru-n-600">{row.stage}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-ru-n-100">
                    <span
                      style={{ transitionDelay: `${i * 110}ms` }}
                      className={`block h-full origin-left rounded-full ${row.tone} ${row.width} ${grow} ${
                        funnelShown ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </span>
                  <span className="text-right text-[13.5px] font-semibold text-ru-n-700 tabular-nums">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>

            <h3 className={`${cardTitle} mt-8`}>Leads by source</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SOURCES.map((source) => (
                <div
                  key={source.source}
                  className="rounded-xl border border-ru-n-200 bg-ru-n-50 p-3"
                >
                  <div className="font-display text-[20px] font-bold text-ru-n-700 tabular-nums">
                    {source.count}
                  </div>
                  <div className="truncate text-[12.5px] text-ru-n-500">{source.source}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={card}>
            <h3 className={cardTitle}>Forecast</h3>
            <p className="mb-5 text-[13.5px] text-ru-n-400">
              Expected wins by close month, weighted by each stage's probability
            </p>
            <div
              ref={forecastRef}
              className="flex h-44 items-end justify-around gap-4 border-b border-ru-n-200"
            >
              {FORECAST.map((month, i) => (
                <div
                  key={month.month}
                  className="flex h-full w-14 flex-col items-center justify-end gap-2"
                >
                  <span className="text-[13.5px] font-semibold text-ru-n-700 tabular-nums">
                    {month.wins}
                  </span>
                  <span
                    style={{ transitionDelay: `${i * 120}ms` }}
                    className={`block w-full origin-bottom rounded-t-lg bg-ru-blue-600 ${month.height} ${grow} ${
                      forecastShown ? "scale-y-100" : "scale-y-0"
                    }`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-around gap-4">
              {FORECAST.map((month) => (
                <span key={month.month} className="w-14 text-center text-[13px] text-ru-n-500">
                  {month.month}
                </span>
              ))}
            </div>
            <p className="mt-5 text-[13.5px]/[1.5] text-ru-n-500">
              Counted in leads, not currency — set a close date on a lead and it lands in its month.
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-[13px] text-ru-n-400">Sample data.</p>
      </div>
    </section>
  );
}

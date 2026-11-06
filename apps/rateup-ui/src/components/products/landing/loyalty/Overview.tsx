import { CountUp, useReveal } from "@/components/RateupHomePage/shared/home-ui";

import { BAND, SectionHead } from "../shared/section";
import { OVERVIEW_TILES, TIERS, TOP_REWARDS } from "./content";

const card = "rounded-2xl border border-ru-n-200 bg-white p-5.5 sm:p-7";
const cardTitle = "font-display text-[18px] font-bold tracking-[-0.018em] text-ru-n-700";

export default function Overview() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <section id="overview" className="border-y border-ru-n-100 bg-ru-n-50">
      <div className={BAND}>
        <SectionHead
          eyebrow="Overview"
          icon={<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />}
          title="See what the programme is doing."
        >
          Members, points issued and redeemed, what you still owe in points, repeat visits and the
          rewards people actually claim — over 30 days, 90 days or a year.
        </SectionHead>

        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {OVERVIEW_TILES.map((tile) => (
            <div key={tile.label} className={card}>
              <div className="font-display text-[clamp(1.625rem,3.4vw,2.25rem)]/none font-bold tracking-[-0.03em] text-ru-n-700">
                <CountUp value={tile.value} />
              </div>
              <div className="mt-2 text-[14.5px] text-ru-n-500">{tile.label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className={card}>
            <h3 className={cardTitle}>Members by tier</h3>
            <div ref={ref} className="mt-5 flex flex-col gap-3.5">
              {TIERS.map((tier, i) => (
                <div
                  key={tier.name}
                  className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3"
                >
                  <span className="text-[14px] text-ru-n-600">{tier.name}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-ru-n-100">
                    <span
                      style={{ transitionDelay: `${i * 120}ms` }}
                      className={`block h-full origin-left rounded-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${tier.tone} ${tier.width} ${
                        shown ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </span>
                  <span className="text-right text-[14px] font-semibold text-ru-n-700 tabular-nums">
                    {tier.count.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={card}>
            <h3 className={cardTitle}>Most-redeemed rewards</h3>
            <ol className="mt-4 flex list-none flex-col p-0">
              {TOP_REWARDS.map((reward, i) => (
                <li
                  key={reward.name}
                  className="flex items-center gap-3 border-b border-ru-n-100 py-2.75 last:border-b-0"
                >
                  <span className="font-mono text-[12.5px] font-semibold text-ru-n-400">
                    0{i + 1}
                  </span>
                  <span className="flex-1 text-[14.5px] text-ru-n-700">{reward.name}</span>
                  <span className="text-[14px] text-ru-n-500 tabular-nums">
                    {reward.redeemed} redeemed
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <p className="mt-5 text-center text-[13px] text-ru-n-400">Sample data.</p>
      </div>
    </section>
  );
}

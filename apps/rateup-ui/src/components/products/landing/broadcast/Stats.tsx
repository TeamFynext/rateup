import { BROADCAST_STATS } from "./content";

/**
 * The three-figure band between the problem and the product tour.
 *
 * The figures are static. The homepage animates its metrics with `CountUp`, but the design system
 * ships `StatBlock` as a plain figure, and a counter here would sit at zero for anyone whose
 * viewport never scrolls the band into view.
 */
export default function Stats() {
  return (
    <section className="border-y border-ru-n-100 bg-ru-n-50 py-[clamp(2.5rem,5vw,4rem)]">
      <div className="mx-auto grid max-w-280 grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6 px-5">
        {BROADCAST_STATS.map((stat) => (
          <div key={stat.label} className={`rounded-xl px-5.5 py-5 ${stat.panel}`}>
            <div className="flex flex-col items-start gap-1.5">
              <span className="font-display text-[34px]/[1.05] font-bold tracking-[-0.028em] tabular-nums text-ru-n-700">
                {stat.value}
              </span>
              <span className="text-[13px]/[1.45] text-ru-n-500">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

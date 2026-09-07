import { API_STATS } from "./content";

/** Three figures, each with a short label and a line saying where it comes from. */
export default function Stats() {
  return (
    <section className="border-t border-ru-n-100 bg-ru-n-50">
      <div className="mx-auto grid max-w-280 grid-cols-1 gap-6 px-5 py-[clamp(2.5rem,5vw,4rem)] sm:grid-cols-3">
        {API_STATS.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-2">
            <span className="font-display text-[44px]/[1.05] font-bold tracking-[-0.03em] tabular-nums text-ru-n-700">
              {stat.value}
            </span>
            <span className="text-[15px] font-medium text-ru-n-600">{stat.label}</span>
            <span className="text-[13px]/[1.45] text-ru-n-500">{stat.note}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

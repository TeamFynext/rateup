import { CountUp } from "@/components/RateupHomePage/shared/home-ui";

import { BAND, SectionHead } from "../shared/section";
import { INSIGHT_TILES, TOOLS } from "./content";

const card = "rounded-2xl border border-ru-n-200 bg-white p-5.5 sm:p-7";

export default function Insights() {
  return (
    <section id="insights" className="bg-white">
      <div className={BAND}>
        <SectionHead
          eyebrow="Insights"
          icon={<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />}
          title="Know what it handled, and what it passed on."
        >
          Conversations handled, chats waiting on your team, how each tool performs, and a
          turn-by-turn view of any customer's conversation.
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

        <div className={`${card} min-w-0`}>
          <h3 className="font-display text-[18px] font-bold tracking-[-0.018em] text-ru-n-700">
            Tool calls
          </h3>
          <p className="mb-4 text-[13.5px] text-ru-n-400">Last 7 days</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-90 border-collapse text-left text-[14px]">
              <caption className="sr-only">Sample tool calls over the last 7 days</caption>
              <thead>
                <tr className="border-b border-ru-n-200 text-[12px] tracking-[0.04em] text-ru-n-400 uppercase">
                  <th className="py-2 pr-3 font-semibold">Tool</th>
                  <th className="py-2 font-semibold">Calls</th>
                </tr>
              </thead>
              <tbody>
                {TOOLS.map((tool) => (
                  <tr key={tool.name} className="border-b border-ru-n-100 last:border-b-0">
                    <td className="py-2.5 pr-3 font-mono text-[13px] text-ru-n-700">{tool.name}</td>
                    <td className="py-2.5 text-ru-n-600 tabular-nums">{tool.calls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-5 text-center text-[13px] text-ru-n-400">Sample data.</p>
      </div>
    </section>
  );
}

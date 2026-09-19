import { CountUp, useReveal } from "@/components/RateupHomePage/shared/home-ui";
import { Avatar } from "@/components/RateupHomePage/shared/mockups/kit";

import { AGENT_ROWS } from "./content";
import { BAND, SectionHead } from "./parts";

const TILES = [
  { value: "1,038", label: "Conversations handled" },
  { value: "4m 12s", label: "Average response time" },
  { value: "27", label: "Open right now" },
];

const REPORTS = ["Overview", "Agent performance", "Team performance", "Trends", "Message logs"];

const card = "rounded-2xl border border-ru-n-200 bg-white p-5.5 sm:p-7";
const cardTitle = "font-display text-[18px] font-bold tracking-[-0.018em] text-ru-n-700";

export default function Analytics() {
  const [barsRef, shown] = useReveal<HTMLDivElement>();

  return (
    <section id="analytics" className="border-y border-ru-n-100 bg-ru-n-50">
      <div className={BAND}>
        <SectionHead
          eyebrow="Analytics"
          icon={<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />}
          title="Manage the queue by numbers, not by guesswork."
        >
          Conversations handled, average response time and open workload — per agent and per team.
        </SectionHead>

        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          {TILES.map((tile) => (
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
            <h3 className={cardTitle}>Agent performance</h3>
            <p className="mb-4 text-[13.5px] text-ru-n-400">Last 30 days</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-105 border-collapse text-left text-[14px]">
                <caption className="sr-only">
                  Sample agent performance over the last 30 days
                </caption>
                <thead>
                  <tr className="border-b border-ru-n-200 text-[12px] tracking-[0.04em] text-ru-n-400 uppercase">
                    <th className="py-2 pr-3 font-semibold">Agent</th>
                    <th className="py-2 pr-3 font-semibold">Handled</th>
                    <th className="py-2 pr-3 font-semibold">Avg response</th>
                    <th className="py-2 font-semibold">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {AGENT_ROWS.map((agent) => (
                    <tr key={agent.initials} className="border-b border-ru-n-100 last:border-b-0">
                      <td className="py-2.5 pr-3">
                        <span className="flex items-center gap-2.5 font-medium text-ru-n-700">
                          <Avatar
                            initials={agent.initials}
                            className={agent.tone}
                            size="size-7 text-[11px]"
                          />
                          {agent.name}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-ru-n-600 tabular-nums">{agent.handled}</td>
                      <td className="py-2.5 pr-3 text-ru-n-600 tabular-nums">{agent.response}</td>
                      <td className="py-2.5 text-ru-n-600 tabular-nums">{agent.open}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={card}>
            <h3 className={cardTitle}>Workload</h3>
            <p className="mb-5 text-[13.5px] text-ru-n-400">Open conversations per agent</p>
            <div ref={barsRef} className="flex flex-col gap-3.5">
              {AGENT_ROWS.map((agent, i) => (
                <div key={agent.initials} className="flex items-center gap-3">
                  <Avatar
                    initials={agent.initials}
                    className={agent.tone}
                    size="size-7 text-[11px]"
                  />
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-ru-blue-100">
                    <span
                      style={{ transitionDelay: `${i * 120}ms` }}
                      className={`block h-full origin-left rounded-full bg-ru-blue-600 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${agent.load} ${
                        shown ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </span>
                  <span className="w-5 flex-none text-right text-[13.5px] font-semibold text-ru-n-700 tabular-nums">
                    {agent.open}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {REPORTS.map((report) => (
            <span
              key={report}
              className="rounded-full border border-ru-n-200 bg-white px-3 py-1.5 text-[13.5px] text-ru-n-600"
            >
              {report}
            </span>
          ))}
          <span className="w-full pt-1 text-center text-[13px] text-ru-n-400">Sample data.</span>
        </div>
      </div>
    </section>
  );
}

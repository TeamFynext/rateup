import { Avatar, ChannelDot } from "@/components/RateupHomePage/shared/mockups/kit";

import { useScript } from "../../shared/useScript";
import { BOARD_SCRIPT, type Card, STAGES } from "./script";

const TABS = ["Board", "List", "Forecast", "Insights"];
const VIEWS = ["All leads on board", "Mine", "Needs attention", "No next activity"];

const TEAM_TONES: Record<string, string> = {
  RK: "bg-ru-blue-600",
  FA: "bg-ru-green-600",
  SN: "bg-ru-amber-600",
};

const enter = "animate-ru-msg-in motion-reduce:animate-none";

function SourceBadge({ source }: Readonly<{ source: Card["source"] }>) {
  if (source !== "referral") {
    return <ChannelDot channel={source} className="absolute -right-0.5 -bottom-0.5" />;
  }
  return (
    <span className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-ru-amber-500 text-white ring-2 ring-white">
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-2" aria-hidden="true">
        <path d="m12 3 2.6 5.5 6 .8-4.4 4.1 1.1 6L12 16.5l-5.3 2.9 1.1-6L3.4 9.3l6-.8L12 3Z" />
      </svg>
    </span>
  );
}

function LeadCard({ card }: Readonly<{ card: Card }>) {
  const strip = card.won
    ? "bg-ru-green-50 text-ru-green-700"
    : card.next
      ? "bg-ru-n-100 text-ru-n-700"
      : "bg-ru-amber-50 text-ru-amber-700";

  return (
    <div
      className={`rounded-xl border bg-white p-2.75 shadow-xs ${enter} ${
        card.idle ? "border-red-300" : "border-ru-n-200"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="relative flex-none">
          <Avatar initials={card.initials} className={card.tone} size="size-7.5 text-[11px]" />
          <SourceBadge source={card.source} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-medium text-ru-n-700">{card.name}</div>
          <div className="truncate text-[10.5px] text-ru-n-400">{card.company}</div>
        </div>
      </div>

      {card.label && (
        <span className="mt-2 inline-block rounded-full bg-ru-blue-50 px-2 py-0.5 text-[10px] font-medium text-ru-blue-700">
          {card.label}
        </span>
      )}

      <div
        className={`mt-2 truncate rounded-sm px-2 py-1 text-[10.5px] font-semibold transition-colors duration-500 ${strip}`}
      >
        {card.won ? "Won · closed" : (card.next ?? "No next activity scheduled")}
      </div>

      <div className="mt-2 flex items-center">
        <span className="flex -space-x-1.5">
          {card.assignees.map((initials) => (
            <Avatar
              key={initials}
              initials={initials}
              className={`ring-2 ring-white ${TEAM_TONES[initials]}`}
              size="size-5 text-[8.5px]"
            />
          ))}
        </span>
        <span className="flex-1" />
        {!card.won && (
          <span
            className={`text-[10.5px] font-medium tabular-nums ${
              card.idle ? "text-red-600" : "text-ru-n-400"
            }`}
          >
            {card.idle ? `Idle ${card.days}d` : `${card.days}d in stage`}
          </span>
        )}
      </div>
    </div>
  );
}

/** The Leads board playing one lead from the inbox to Qualified while another closes as Won. */
export default function BoardMock() {
  const [ref, state] = useScript(BOARD_SCRIPT);

  return (
    <div
      ref={ref}
      role="img"
      aria-label="The RateUp Leads board: columns from New Lead to Won, with cards showing each lead's owner, next activity and days in stage. A lead added from the inbox moves to Qualified while another closes as Won."
      className="relative overflow-hidden rounded-[20px] border border-ru-n-200 bg-white shadow-[0_24px_64px_rgba(16,24,40,0.1)] select-none"
    >
      <div aria-hidden="true" className="text-left">
        <div className="flex items-center gap-3 border-b border-ru-n-200 px-4 py-3">
          <span className="font-display text-[15px] font-bold text-ru-n-700">Leads</span>
          <span className="flex gap-1 max-sm:hidden">
            {TABS.map((tab, i) => (
              <span
                key={tab}
                className={`rounded-md px-2.5 py-1 text-[12px] font-medium ${
                  i === 0 ? "bg-ru-blue-50 text-ru-blue-700" : "text-ru-n-500"
                }`}
              >
                {tab}
              </span>
            ))}
          </span>
          <span className="flex-1" />
          <span className="rounded-lg bg-ru-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white">
            Add lead
          </span>
        </div>

        <div className="flex gap-1.5 overflow-hidden border-b border-ru-n-100 px-4 py-2.5">
          {VIEWS.map((view, i) => (
            <span
              key={view}
              className={`flex-none rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                i === 0
                  ? "border-ru-n-700 bg-ru-n-700 text-white"
                  : "border-ru-n-200 bg-white text-ru-n-500"
              }`}
            >
              {view}
            </span>
          ))}
        </div>

        {/* Fixed height: cards move between columns, and the page below must not move. */}
        <div className="flex h-104 gap-3 overflow-hidden bg-ru-n-25 p-3.5 sm:h-110">
          {STAGES.map((stage) => {
            const cards = state.columns[stage.id];
            return (
              <div
                key={stage.id}
                className="flex w-56 flex-none flex-col gap-2 rounded-xl bg-ru-n-50 p-2.5"
              >
                <div className="flex items-center gap-2 px-0.5 pb-0.5">
                  <span className={`size-2 rounded-full ${stage.dot}`} />
                  <span className="truncate text-[12px] font-semibold text-ru-n-700">
                    {stage.name}
                  </span>
                  <span className="ml-auto text-[11px] font-medium text-ru-n-400 tabular-nums">
                    {cards.length}
                  </span>
                </div>
                {cards.map((card) => (
                  <LeadCard key={`${stage.id}-${card.id}`} card={card} />
                ))}
              </div>
            );
          })}
        </div>

        {state.toast && (
          <div
            key={state.toast}
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-ru-n-700 px-4 py-2 text-[12px] font-medium whitespace-nowrap text-white shadow-lg ${enter}`}
          >
            {state.toast}
          </div>
        )}
      </div>
    </div>
  );
}

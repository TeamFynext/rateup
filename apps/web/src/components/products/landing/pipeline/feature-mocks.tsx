import { useReveal } from "@/components/RateupHomePage/shared/home-ui";
import { Avatar, Inset } from "@/components/RateupHomePage/shared/mockups/kit";

import { rowDelay, rowReveal } from "../shared/mini";

const STAGE_OPTIONS = ["New Lead", "Contacted", "Qualified", "Demo / Proposal", "Negotiation"];

/** The inbox side panel's lead stage picker, open on the contact's current stage. */
export function StagePickerMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="rounded-lg border border-ru-n-200 bg-white p-2.5">
        <div className="mb-1.5 text-[10.5px] font-semibold tracking-[0.06em] text-ru-n-400 uppercase">
          Lead stage
        </div>
        <div className="flex flex-col gap-1">
          {STAGE_OPTIONS.map((stage, i) => (
            <span
              key={stage}
              style={rowDelay(i)}
              className={`flex items-center justify-between rounded-md px-2 py-1.25 text-[12.5px] ${rowReveal(shown)} ${
                stage === "Qualified"
                  ? "bg-ru-blue-50 font-semibold text-ru-blue-700"
                  : "text-ru-n-600"
              }`}
            >
              {stage}
              {stage === "Qualified" && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3.5"
                  aria-hidden="true"
                >
                  <path d="m5 13 4 4L19 7" />
                </svg>
              )}
            </span>
          ))}
        </div>
      </div>
    </Inset>
  );
}

/** An automation rule firing on a stage change. */
export function StageRuleMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();
  const lines = [
    { tag: "When", text: "Lead stage changes to Won", tone: "bg-ru-blue-50 text-ru-blue-700" },
    { tag: "Then", text: "Attach label · Customer", tone: "bg-ru-green-50 text-ru-green-700" },
    { tag: "Then", text: "Send template · thank_you", tone: "bg-ru-green-50 text-ru-green-700" },
  ];

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        {lines.map((line, i) => (
          <div
            key={line.text}
            style={rowDelay(i)}
            className={`flex items-center gap-2 rounded-lg border border-ru-n-200 bg-white px-2.5 py-2 ${rowReveal(shown)}`}
          >
            <span
              className={`flex-none rounded px-1.5 py-0.5 text-[10px] font-bold tracking-[0.05em] uppercase ${line.tone}`}
            >
              {line.tag}
            </span>
            <span className="min-w-0 truncate text-[12.5px] text-ru-n-700">{line.text}</span>
          </div>
        ))}
      </div>
    </Inset>
  );
}

/** The Meta AI Agent's built-in tool moving the customer it is talking to. */
export function AgentToolMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        <div
          style={rowDelay(0)}
          className={`max-w-[88%] self-start rounded-[12px_12px_12px_4px] border border-ru-n-200 bg-white px-2.75 py-2 text-[12.5px]/[1.45] text-ru-n-600 ${rowReveal(shown)}`}
        >
          I'd like a quote for 40 chairs.
        </div>
        <div
          style={rowDelay(1)}
          className={`self-center rounded-full border border-ru-n-200 bg-white px-2.5 py-1 font-mono text-[10.5px] text-ru-n-500 ${rowReveal(shown)}`}
        >
          set_lead_stage → Qualified
        </div>
        <div
          style={rowDelay(2)}
          className={`max-w-[88%] self-end rounded-[12px_12px_4px_12px] bg-ru-blue-600 px-2.75 py-2 text-[12.5px]/[1.45] text-white ${rowReveal(shown)}`}
        >
          Happy to help — I've passed this to our sales team.
        </div>
      </div>
    </Inset>
  );
}

/** List view with two rows ticked and the bulk bar showing. */
export function ListMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();
  const rows = [
    { name: "Dev R.", stage: "New Lead", on: true },
    { name: "Ananya I.", stage: "Contacted", on: true },
    { name: "Kabir M.", stage: "Qualified", on: false },
  ];

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        <div
          style={rowDelay(0)}
          className={`flex items-center justify-between rounded-lg bg-ru-n-700 px-2.75 py-1.75 text-[11.5px] text-white ${rowReveal(shown)}`}
        >
          <span>2 selected</span>
          <span className="flex gap-2.5 font-semibold">
            <span>Move</span>
            <span>Assign</span>
          </span>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.name}
            style={rowDelay(i + 1)}
            className={`flex items-center gap-2.5 rounded-lg border border-ru-n-200 bg-white px-2.75 py-1.75 ${rowReveal(shown)}`}
          >
            <span
              className={`size-3.5 flex-none rounded-[4px] border ${
                r.on ? "border-ru-blue-600 bg-ru-blue-600" : "border-ru-n-300 bg-white"
              }`}
            />
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ru-n-700">
              {r.name}
            </span>
            <span className="flex-none text-[11.5px] text-ru-n-400">{r.stage}</span>
          </div>
        ))}
      </div>
    </Inset>
  );
}

/** A lead's history, newest first. */
export function HistoryMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();
  const events = [
    { who: "RK", tone: "bg-ru-blue-600", text: "Moved to Qualified", at: "10:12" },
    { who: "FA", tone: "bg-ru-green-600", text: "Note: wants delivery by the 20th", at: "09:40" },
    { who: "RK", tone: "bg-ru-blue-600", text: "Task done · Call back", at: "Yesterday" },
  ];

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        {events.map((event, i) => (
          <div
            key={event.text}
            style={rowDelay(i)}
            className={`flex items-center gap-2.5 rounded-lg border border-ru-n-200 bg-white px-2.75 py-1.75 ${rowReveal(shown)}`}
          >
            <Avatar initials={event.who} className={event.tone} size="size-6 text-[9.5px]" />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-ru-n-700">
              {event.text}
            </span>
            <span className="flex-none text-[11px] text-ru-n-400">{event.at}</span>
          </div>
        ))}
      </div>
    </Inset>
  );
}

const TASK_TYPES = ["Call", "Message", "Meeting", "Document", "To-do"];

/** The next-activity picker: a task type, a time and who it's for. */
export function TaskMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="rounded-lg border border-ru-n-200 bg-white p-2.5">
        <div className="mb-2 flex flex-wrap gap-1">
          {TASK_TYPES.map((type, i) => (
            <span
              key={type}
              style={rowDelay(i)}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${rowReveal(shown)} ${
                type === "Call"
                  ? "border-ru-blue-600 bg-ru-blue-600 text-white"
                  : "border-ru-n-200 text-ru-n-500"
              }`}
            >
              {type}
            </span>
          ))}
        </div>
        <div className="truncate text-[12.5px] font-medium text-ru-n-700">Call about the quote</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ru-n-400">
          Tomorrow 11:00 AM ·
          <Avatar initials="SN" className="bg-ru-amber-600" size="size-4.5 text-[8px]" />
          Sneha N.
        </div>
      </div>
    </Inset>
  );
}

/** A stale card, outlined, with how long it has been idle. */
export function IdleMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        <div
          style={rowDelay(0)}
          className={`rounded-lg border border-red-300 bg-white px-2.75 py-2 ${rowReveal(shown)}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-ru-n-700">Kabir M.</span>
            <span className="text-[11px] font-medium text-red-600">Idle 6d</span>
          </div>
          <div className="mt-1.5 rounded-sm bg-ru-amber-50 px-2 py-1 text-[11px] font-semibold text-ru-amber-700">
            No next activity scheduled
          </div>
        </div>
        <div style={rowDelay(1)} className={`flex flex-wrap gap-1 ${rowReveal(shown)}`}>
          {["Mine", "Needs attention", "No next activity"].map((view) => (
            <span
              key={view}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                view === "Needs attention"
                  ? "border-ru-n-700 bg-ru-n-700 text-white"
                  : "border-ru-n-200 bg-white text-ru-n-500"
              }`}
            >
              {view}
            </span>
          ))}
        </div>
      </div>
    </Inset>
  );
}

/** A spreadsheet going in, and the same columns coming back out. */
export function ImportMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();
  const columns = ["Name", "Phone", "Stage", "Source", "Assignee email", "Expected close"];

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        <div
          style={rowDelay(0)}
          className={`flex items-center gap-2.5 rounded-lg border border-ru-n-200 bg-white px-2.75 py-2 ${rowReveal(shown)}`}
        >
          <span className="flex size-7 flex-none items-center justify-center rounded-md bg-ru-green-50 text-[9.5px] font-bold text-ru-green-700">
            XLSX
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-medium text-ru-n-700">
              expo-leads.xlsx
            </span>
            <span className="block text-[11px] text-ru-n-400">312 rows ready to import</span>
          </span>
        </div>
        <div style={rowDelay(1)} className={`flex flex-wrap gap-1 ${rowReveal(shown)}`}>
          {columns.map((column) => (
            <span
              key={column}
              className="rounded-md border border-ru-n-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-ru-n-500"
            >
              {column}
            </span>
          ))}
        </div>
      </div>
    </Inset>
  );
}

const BOARDS = [
  { name: "Leads", meta: "Inbox, automations and CRM sync", dot: "bg-ru-blue-600" },
  { name: "Support", meta: "New → In progress → Resolved", dot: "bg-ru-green-600" },
  { name: "Projects", meta: "To do → Review → Done", dot: "bg-ru-amber-500" },
  { name: "Custom", meta: "Your own columns", dot: "bg-ru-n-400" },
];

/** The board switcher: the one Leads board and the other types beside it. */
export function BoardsMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        {BOARDS.map((board, i) => (
          <div
            key={board.name}
            style={rowDelay(i)}
            className={`flex items-center gap-2.5 rounded-lg border border-ru-n-200 bg-white px-2.75 py-1.75 ${rowReveal(shown)}`}
          >
            <span className={`size-2 flex-none rounded-full ${board.dot}`} />
            <span className="text-[12.5px] font-medium text-ru-n-700">{board.name}</span>
            <span className="ml-auto min-w-0 truncate text-[11px] text-ru-n-400">{board.meta}</span>
          </div>
        ))}
      </div>
    </Inset>
  );
}

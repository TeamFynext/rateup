import { useReveal } from "@/components/RateupHomePage/shared/home-ui";
import { Avatar, Inset } from "@/components/RateupHomePage/shared/mockups/kit";

const row = (shown: boolean) =>
  `transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
    shown ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
  }`;
const delay = (i: number) => ({ transitionDelay: `${i * 160}ms` });

const AGENTS = [
  { initials: "RK", name: "Rohan K.", meta: "Orders team · 4 open", tone: "bg-ru-blue-600" },
  { initials: "FA", name: "Fatima A.", meta: "Support team · 3 open", tone: "bg-ru-green-600" },
];

/** The unassigned banner with its "Assign to me", above two teammates and their load. */
export function AssignMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        <div
          style={delay(0)}
          className={`flex items-center justify-between gap-2 rounded-lg border border-dashed border-ru-amber-300 bg-ru-amber-50 px-2.75 py-2 ${row(shown)}`}
        >
          <span className="min-w-0 truncate text-[12.5px] font-medium text-ru-amber-700">
            #2039 is unassigned
          </span>
          <span className="flex-none rounded-md bg-ru-blue-600 px-2 py-1 text-[11.5px] font-semibold text-white">
            Assign to me
          </span>
        </div>
        {AGENTS.map((agent, i) => (
          <div
            key={agent.initials}
            style={delay(i + 1)}
            className={`flex items-center gap-2.5 rounded-lg border border-ru-n-200 bg-white px-2.75 py-2 ${row(shown)}`}
          >
            <Avatar initials={agent.initials} className={agent.tone} size="size-7 text-[11px]" />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-ru-n-700">{agent.name}</div>
              <div className="truncate text-[11.5px] text-ru-n-400">{agent.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </Inset>
  );
}

const NOTES = [
  {
    who: "Rohan K. · 09:04",
    text: "Payment captured, warehouse hasn't scanned it. @Fatima safe to promise dispatch today?",
  },
  {
    who: "Fatima A. · 09:06",
    text: "Confirmed with the warehouse. Sending the tracking link now.",
  },
];

export function NotesMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        {NOTES.map((note, i) => (
          <div
            key={note.who}
            style={delay(i)}
            className={`rounded-lg border border-ru-amber-200 bg-ru-amber-50 px-2.75 py-2 text-[12.5px]/[1.45] text-ru-n-700 ${row(shown)}`}
          >
            <span className="mb-0.5 block text-[10.5px] font-semibold tracking-[0.05em] text-ru-amber-700 uppercase">
              {note.who}
            </span>
            {note.text}
          </div>
        ))}
        <span className="px-0.5 pt-0.5 text-[12px] font-semibold text-ru-blue-600">
          1 mention waiting for you
        </span>
      </div>
    </Inset>
  );
}

const RULES = [
  { trigger: "New message outside 9–6", action: "Send the after-hours reply" },
  { trigger: "Message contains “refund”", action: "Tag #refund · assign to Orders" },
];

export function RulesMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        {RULES.map((rule, i) => (
          <div
            key={rule.trigger}
            style={delay(i)}
            className={`flex flex-col gap-1.25 rounded-lg border border-ru-n-200 bg-white px-2.75 py-2 text-[12.5px] text-ru-n-600 ${row(shown)}`}
          >
            <span className="flex items-center gap-2">
              <span className="w-10 flex-none rounded bg-ru-amber-50 py-px text-center text-[10.5px] font-semibold text-ru-amber-700">
                When
              </span>
              <span className="truncate">{rule.trigger}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-10 flex-none rounded bg-ru-blue-50 py-px text-center text-[10.5px] font-semibold text-ru-blue-600">
                Then
              </span>
              <span className="truncate">{rule.action}</span>
            </span>
          </div>
        ))}
        <div
          style={delay(2)}
          className={`flex items-center gap-2 rounded-lg border border-ru-n-200 bg-white px-2.75 py-2 text-[12.5px] text-ru-n-500 ${row(shown)}`}
        >
          <span className="rounded bg-ru-n-100 px-1.5 font-mono text-[11.5px] text-ru-n-600">
            /hours
          </span>
          <span className="truncate">We're open 9am–6pm, Monday to Saturday.</span>
        </div>
      </div>
    </Inset>
  );
}

/** The session clock near its end, then the composer as it locks once the window closes. */
export function SessionMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        <div
          style={delay(0)}
          className={`flex items-center justify-between rounded-lg border border-ru-n-200 bg-white px-2.75 py-2 ${row(shown)}`}
        >
          <span className="text-[12.5px] font-medium text-ru-n-700">Dev R.</span>
          <span className="rounded-full border border-ru-amber-200 bg-ru-amber-50 px-2 py-0.5 text-[11px] font-semibold text-ru-amber-700">
            Session · 0h 42m left
          </span>
        </div>
        <div
          style={delay(1)}
          className={`rounded-lg border border-ru-n-200 bg-white px-2.75 py-2 ${row(shown)}`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-ru-n-700">Aisha K.</span>
            <span className="rounded-full border border-ru-n-200 bg-ru-n-50 px-2 py-0.5 text-[11px] font-semibold text-ru-n-500">
              No session
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-1 truncate rounded-md border border-dashed border-ru-n-300 bg-ru-n-50 px-2.5 py-1.75 text-[11.5px] text-ru-n-400">
              Replies are locked
            </span>
            <span className="flex-none rounded-md bg-ru-blue-600 px-2.5 py-1.75 text-[11.5px] font-semibold text-white">
              Send a template
            </span>
          </div>
        </div>
      </div>
    </Inset>
  );
}

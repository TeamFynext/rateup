import { CheckIcon, useReveal } from "../home-ui";
import { Avatar, type Channel, ChannelDot, Inset } from "./kit";

const INBOX_THREADS: ReadonlyArray<{
  initials: string;
  tone: string;
  name: string;
  at: string;
  preview: string;
  channel: Channel;
  tag?: string;
  assignee?: string;
  active?: boolean;
}> = [
  {
    initials: "RK",
    tone: "bg-ru-blue-600",
    name: "Rohan K.",
    at: "2m",
    preview: "Can I change my delivery address?",
    channel: "whatsapp",
    tag: "Orders",
    assignee: "AM",
    active: true,
  },
  {
    initials: "MN",
    tone: "bg-ru-green-600",
    name: "Meera N.",
    at: "14m",
    preview: "Is the blue one back in stock?",
    channel: "instagram",
    tag: "Sales",
  },
  {
    initials: "FA",
    tone: "bg-ru-blue-400",
    name: "Fatima A.",
    at: "1h",
    preview: "Do you ship to Dubai?",
    channel: "messenger",
  },
];

/** Three conversations from three channels in one queue, one of them assigned and tagged. */
export function InboxList() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-0.5">
        {INBOX_THREADS.map((t, i) => (
          <div
            key={t.initials}
            style={{ transitionDelay: `${i * 160}ms` }}
            className={`flex gap-2.5 rounded-lg px-2.5 py-2.25 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
              t.active ? "bg-ru-blue-50" : ""
            } ${shown ? "translate-x-0 opacity-100" : "-translate-x-1.5 opacity-0"}`}
          >
            <span className="relative flex-none">
              <Avatar initials={t.initials} className={t.tone} size="size-8 text-[12px]" />
              <ChannelDot channel={t.channel} className="absolute -right-0.5 -bottom-0.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2">
                <span className="text-[13.5px] font-medium text-ru-n-700">{t.name}</span>
                <span className="text-[11.5px] text-ru-n-400">{t.at}</span>
              </div>
              <div className="truncate text-[12.5px] text-ru-n-500">{t.preview}</div>
              {(t.tag || t.assignee) && (
                <div className="mt-1.25 flex items-center gap-1.5">
                  {t.tag && (
                    <span className="rounded-full border border-ru-n-200 bg-white px-1.75 py-0.25 text-[11px] font-medium text-ru-n-500">
                      {t.tag}
                    </span>
                  )}
                  {t.assignee && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-ru-n-400">
                      <Avatar
                        initials={t.assignee}
                        size="size-4 text-[8px]"
                        className="bg-ru-amber-600"
                      />
                      Assigned
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Inset>
  );
}

const CAMPAIGN_FUNNEL = [
  { label: "Sent", value: "2,400", width: "w-full", tone: "bg-ru-blue-200" },
  { label: "Delivered", value: "2,352", width: "w-[98%]", tone: "bg-ru-blue-300" },
  { label: "Read", value: "1,910", width: "w-[80%]", tone: "bg-ru-blue-500" },
  { label: "Replied", value: "412", width: "w-[17%]", tone: "bg-ru-green-500" },
];

/** A sent broadcast's delivery funnel, as the campaign report draws it. */
export function CampaignStats() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-medium text-ru-n-700">Weekend offer</span>
        <span className="inline-flex flex-none items-center gap-1 text-[12px] text-ru-green-600">
          <CheckIcon className="size-3" />
          Template approved
        </span>
      </div>
      <div ref={ref} className="flex flex-col gap-2">
        {CAMPAIGN_FUNNEL.map((row, i) => (
          <div key={row.label} className="flex items-center gap-2.5">
            <span className="w-15.5 flex-none text-[12px] text-ru-n-500">{row.label}</span>
            <span className="h-1.75 flex-1 overflow-hidden rounded-full bg-ru-n-100">
              {/* scaleX rather than width: it stays on the compositor, so the sweep does not
                  force a layout pass on every frame. */}
              <span
                style={{ transitionDelay: `${i * 120}ms` }}
                className={`block h-full origin-left rounded-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${row.width} ${row.tone} ${
                  shown ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </span>
            <span className="w-9.5 flex-none text-right text-[12px] font-semibold text-ru-n-600 tabular-nums">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </Inset>
  );
}

const PIPELINE = [
  { stage: "New", dot: "bg-ru-blue-400", leads: ["Aisha K.", "Dev R."] },
  { stage: "Qualified", dot: "bg-ru-amber-500", leads: ["Nikhil P."] },
  { stage: "Won", dot: "bg-ru-green-500", leads: ["Sara M."] },
];

/** Three pipeline stages with lead cards dropping into place. */
export function PipelineBoard() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-3">
      <div ref={ref} className="grid grid-cols-3 gap-2">
        {PIPELINE.map((column, c) => (
          <div key={column.stage} className="flex min-w-0 flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ru-n-600">
              <span className={`size-1.5 flex-none rounded-full ${column.dot}`} />
              {column.stage}
            </span>
            {column.leads.map((lead, l) => (
              <span
                key={lead}
                style={{ transitionDelay: `${(c * 2 + l) * 110}ms` }}
                className={`truncate rounded-md border border-ru-n-200 bg-white px-2 py-1.5 text-[11.5px] text-ru-n-600 shadow-xs transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
                  shown ? "translate-y-0 opacity-100" : "-translate-y-1.5 opacity-0"
                }`}
              >
                {lead}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-baseline justify-between border-t border-ru-n-200 pt-2.5">
        <span className="text-[12px] text-ru-n-400">Expected wins this month</span>
        <span className="font-display text-[15px] font-bold text-ru-n-700">12</span>
      </div>
    </Inset>
  );
}

const FLOW_STEPS = [
  { label: "Customer sends “menu”", dot: "bg-ru-green-500" },
  { label: "Reply with a tappable list", dot: "bg-ru-blue-600", active: true },
  { label: "Hand over to the team", dot: "bg-ru-n-400" },
];

/** A keyword flow drawing itself in running order, joined by its connector. */
export function AutomationFlow() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <div ref={ref} className="relative mt-auto flex flex-col gap-3">
      <span
        className={`absolute top-4 bottom-4 left-[15.5px] w-px origin-top bg-ru-n-200 transition-transform duration-700 ease-out motion-reduce:transition-none ${
          shown ? "scale-y-100" : "scale-y-0"
        }`}
      />
      {FLOW_STEPS.map((s, i) => (
        <div
          key={s.label}
          style={{ transitionDelay: `${i * 200}ms` }}
          className={`relative flex items-center gap-2.25 rounded-lg border px-2.75 py-2.25 text-[13.5px] transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
            s.active
              ? "border-ru-blue-200 bg-ru-blue-50 font-medium text-ru-blue-600"
              : "border-ru-n-200 bg-ru-n-50 text-ru-n-600"
          } ${shown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
        >
          <span className={`size-1.5 flex-none rounded-full ${s.dot}`} />
          {s.label}
        </div>
      ))}
    </div>
  );
}

/** The mobile app's cashier step: bill amount in, points out. */
export function CashierMini() {
  return (
    <Inset>
      <div className="mb-2.5 flex items-center gap-2">
        <Avatar initials="MN" size="size-7 text-[11px]" className="bg-ru-green-600" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-ru-n-700">Meera N.</div>
          <div className="text-[11.5px] text-ru-n-400">Gold · 320 points</div>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-ru-n-200 bg-white px-2.75 py-2">
        <span className="text-[12px] text-ru-n-400">Bill amount</span>
        <span className="font-display text-[15px] font-bold text-ru-n-700">₹1,200</span>
      </div>
      <div className="mt-2 rounded-lg bg-ru-blue-600 py-2 text-center text-[13px] font-semibold text-white">
        Add 120 points
      </div>
    </Inset>
  );
}

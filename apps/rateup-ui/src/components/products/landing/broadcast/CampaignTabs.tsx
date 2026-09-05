import type { ReactNode } from "react";
import { useState } from "react";

import { CAMPAIGN_TABS } from "./content";
import type { CampaignTab } from "./content";

/**
 * The product tour: four tabs, one per decision a campaign takes, each pairing an explanation
 * with a mock of the screen that takes it.
 *
 * All four panels are in the DOM and toggled with `hidden`, not mounted on demand — the copy in
 * the inactive panels is the substance of the page, and a crawler that does not click a tab
 * still has to see it.
 */

const TAB_LABEL: Record<CampaignTab, string> = {
  AUDIENCE: "AUDIENCE",
  TEMPLATES: "TEMPLATES",
  SCHEDULING: "SCHEDULING",
  REPORTING: "REPORTING",
};

function Tag({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="inline-flex h-6.5 items-center rounded-md border border-ru-n-200 bg-ru-n-50 px-2.5 text-[12.5px] text-ru-n-600">
      {children}
    </span>
  );
}

const BADGE_TONE = {
  accent: "border-ru-blue-200 bg-ru-blue-50 text-ru-blue-600",
  success: "border-ru-green-100 bg-ru-green-50 text-ru-green-600",
  neutral: "border-ru-n-200 bg-ru-n-50 text-ru-n-500",
  outline: "border-ru-n-200 bg-transparent text-ru-n-600",
  ghost: "border-transparent bg-transparent text-ru-n-500",
} as const;

function Badge({
  tone = "neutral",
  dot = false,
  children,
}: Readonly<{ tone?: keyof typeof BADGE_TONE; dot?: boolean; children: ReactNode }>) {
  return (
    <span
      className={`inline-flex h-5 items-center gap-1 rounded-4xl border px-2 text-xs font-medium tracking-[-0.005em] whitespace-nowrap ${BADGE_TONE[tone]}`}
    >
      {dot && <span className="size-1.5 flex-none rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** The card each panel's mock sits in — the design system's `Card` at `padding="md"`. */
function MockCard({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-xs ring-1 ring-ru-n-200 ring-inset">
      {children}
    </div>
  );
}

function CardTitle({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="font-display text-base/[1.35] font-medium tracking-[-0.01em] text-ru-n-700">
      {children}
    </span>
  );
}

function Overline({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="text-[11.5px] font-semibold tracking-[0.1em] text-ru-n-400 uppercase">
      {children}
    </span>
  );
}

function Panel({
  title,
  body,
  tags,
  children,
  hidden,
}: Readonly<{
  title: string;
  body: ReactNode;
  tags: readonly string[];
  children: ReactNode;
  hidden: boolean;
}>) {
  return (
    <div
      hidden={hidden}
      className="grid grid-cols-[repeat(auto-fit,minmax(330px,1fr))] items-start gap-11"
    >
      <div className="flex flex-col gap-4.5">
        <h3 className="font-display text-[22px]/[1.25] font-bold tracking-[-0.018em] text-ru-n-700">
          {title}
        </h3>
        <p className="max-w-[66ch] text-base/[1.6] text-ru-n-500">{body}</p>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  highlight = false,
}: Readonly<{ icon: ReactNode; label: string; value: string; highlight?: boolean }>) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg px-3.5 py-3 ${
        highlight ? "border border-ru-blue-200 bg-ru-blue-50" : "bg-ru-n-50"
      }`}
    >
      <span
        className={`flex items-center gap-2.5 text-sm ${highlight ? "text-ru-blue-600" : "text-ru-n-700"}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`size-4 ${highlight ? "" : "text-ru-n-400"}`}
          aria-hidden="true"
        >
          {icon}
        </svg>
        {label}
      </span>
      <span
        className={`text-[13px] tabular-nums ${highlight ? "text-ru-blue-600" : "text-ru-n-400"}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function CampaignTabs() {
  const [active, setActive] = useState<CampaignTab>("AUDIENCE");

  return (
    <section className="py-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto flex max-w-280 flex-col gap-8 px-5">
        <div className="flex flex-col gap-3.5">
          <span className="text-[11.5px] font-semibold tracking-[0.1em] text-ru-blue-500 uppercase">
            How a RateUp campaign works
          </span>
          <h2 className="max-w-[26ch] font-display text-[clamp(1.625rem,3.6vw,2.25rem)]/[1.12] font-bold tracking-[-0.028em] text-pretty text-ru-n-700">
            Every WhatsApp campaign takes four decisions, and RateUp holds all four.
          </h2>
        </div>

        <div
          role="tablist"
          aria-label="Campaign steps"
          className="inline-flex h-9 w-fit max-w-full gap-0.5 overflow-x-auto rounded-lg bg-ru-n-50 p-0.75"
        >
          {CAMPAIGN_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`broadcast-tab-${tab}`}
              aria-selected={active === tab}
              aria-controls={`broadcast-panel-${tab}`}
              onClick={() => setActive(tab)}
              className={`h-full cursor-pointer rounded-md px-3 text-[13.5px] font-medium whitespace-nowrap transition-colors ${
                active === tab ? "bg-white text-ru-n-700 shadow-xs" : "text-ru-n-500"
              }`}
            >
              {TAB_LABEL[tab]}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id="broadcast-panel-AUDIENCE"
          aria-labelledby="broadcast-tab-AUDIENCE"
          hidden={active !== "AUDIENCE"}
        >
          <Panel
            hidden={false}
            title="Pick who gets it in three ways"
            body="Add individual contacts, pull in a saved contact group, or re-target a previous campaign by message status — delivered, read, failed or pending. Import contacts from CSV, XLSX or ODS, and keep a per-campaign consent gate on so you only message people who opted in."
            tags={["Contact groups", "CSV/XLSX import", "Re-target by status", "Consent gate"]}
          >
            <MockCard>
              <CardTitle>Audience</CardTitle>
              <div className="flex flex-col gap-2">
                <Row
                  label="Festive shoppers — Kerala"
                  value="8,420"
                  icon={
                    <>
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </>
                  }
                />
                <Row
                  label="diwali-list.xlsx"
                  value="2,980"
                  icon={
                    <>
                      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                      <path d="M14 2v5h6" />
                      <path d="M8 13h8" />
                      <path d="M8 17h8" />
                    </>
                  }
                />
                <Row
                  highlight
                  label="Re-target: Onam teaser · read"
                  value="1,000"
                  icon={
                    <>
                      <path d="M3 2v6h6" />
                      <path d="M3 8a9 9 0 1 0 3-6.7" />
                    </>
                  }
                />
              </div>
              <div className="flex items-center justify-between border-t border-ru-n-100 pt-3.5">
                <span className="text-[13px] text-ru-n-500">Total recipients</span>
                <span className="font-display text-lg font-bold tabular-nums text-ru-n-700">
                  12,400
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-ru-n-50 p-3.5">
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm text-ru-n-700">
                    Only send messages to contacts who have given consent
                  </span>
                  <span className="text-[13px] text-ru-n-400">Recommended on</span>
                </span>
                {/* A picture of a switch, not a control — the page has nothing to toggle. */}
                <span
                  aria-hidden="true"
                  className="flex h-5.5 w-9.5 flex-none items-center justify-end rounded-full bg-ru-blue-600 px-0.75"
                >
                  <span className="size-4 rounded-full bg-white" />
                </span>
              </div>
            </MockCard>
          </Panel>
        </div>

        <div
          role="tabpanel"
          id="broadcast-panel-TEMPLATES"
          aria-labelledby="broadcast-tab-TEMPLATES"
          hidden={active !== "TEMPLATES"}
        >
          <Panel
            hidden={false}
            title="Approved templates, personalised per contact"
            body="Choose any Meta-approved template — Marketing, Utility or Authentication — then map its body variables to Name or any custom field. Buttons cover quick reply, call phone number, copy offer code, visit website, WhatsApp Flow, a RateUp web survey, view catalog, and single- or multi-product catalog."
            tags={["Marketing & Utility", "Dynamic variables", "Flow buttons", "Catalog buttons"]}
          >
            <MockCard>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>onam_collection_v3</CardTitle>
                <Badge tone="success">Approved</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="accent">Marketing</Badge>
                <Badge tone="outline">English · en_IN</Badge>
                <Badge tone="outline">Image header</Badge>
              </div>
              <div className="flex flex-col gap-2.5">
                <Overline>Body variables</Overline>
                {[
                  { token: "{{1}}", field: "Name", kind: "Contact field" },
                  { token: "{{2}}", field: "home_store", kind: "Custom field" },
                ].map((row) => (
                  <div
                    key={row.token}
                    className="grid grid-cols-[64px_20px_1fr] items-center gap-2.5"
                  >
                    <span className="rounded bg-ru-n-100 px-2 py-1.25 text-center text-[13px] text-ru-n-600">
                      {row.token}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-4 text-ru-n-400"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                    <span className="flex items-center justify-between rounded-md border border-ru-n-200 px-3 py-1.75 text-sm text-ru-n-700">
                      {row.field}
                      <span className="text-xs text-ru-n-400">{row.kind}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2.5 border-t border-ru-n-100 pt-3.5">
                <Overline>Buttons on this template</Overline>
                <div className="flex flex-wrap gap-2">
                  <Badge>Visit website</Badge>
                  <Badge>Copy offer code</Badge>
                  <Badge>Quick reply</Badge>
                  <Badge tone="ghost">+ Flow, catalog, call</Badge>
                </div>
              </div>
            </MockCard>
          </Panel>
        </div>

        <div
          role="tabpanel"
          id="broadcast-panel-SCHEDULING"
          aria-labelledby="broadcast-tab-SCHEDULING"
          hidden={active !== "SCHEDULING"}
        >
          <Panel
            hidden={false}
            title="Send now, schedule later, or drip over weeks"
            body="Send Now, or Schedule Later with a date and time. Set a daily send limit and RateUp spreads the campaign across days for you. Drip campaigns run multiple stages, each with its own template, delay in minutes, hours, days, weeks or months, and its own send-at time — start and pause whenever you need."
            tags={["Send now", "Schedule", "Daily limit", "Drip stages"]}
          >
            <MockCard>
              <CardTitle>Schedule</CardTitle>
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-ru-n-600">Daily send limit</span>
                <span className="flex h-9 items-center justify-between rounded-md border border-ru-n-200 bg-white px-3 text-sm tabular-nums text-ru-n-700">
                  2,500 <span className="text-xs text-ru-n-400">per day</span>
                </span>
                <span className="text-[13px] text-ru-n-400">
                  Max messages sent per day. Leave empty to send to everyone at once.
                </span>
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-ru-blue-200 bg-ru-blue-50 p-3.5">
                <span className="flex items-center gap-2 text-sm font-medium text-ru-blue-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  12,400 recipients will be sent over 5 days
                </span>
                <span className="text-[13px] text-ru-blue-500">
                  Next batch: 2,500 messages on Tue 9:00
                </span>
              </div>
              <div className="flex flex-col gap-2.5 border-t border-ru-n-100 pt-3.5">
                <span className="flex items-center justify-between">
                  <Overline>Drip stages</Overline>
                  <Badge tone="success" dot>
                    Running
                  </Badge>
                </span>
                {[
                  { n: "1", name: "onam_teaser", when: "Day 0 · 10:00", done: true },
                  { n: "2", name: "onam_collection_v3", when: "+3 days · 9:00", done: true },
                  { n: "3", name: "last_call_offer", when: "+1 week · 18:30", done: false },
                ].map((stage) => (
                  <div
                    key={stage.n}
                    className="flex items-center gap-3 rounded-md bg-ru-n-50 px-3 py-2.5"
                  >
                    <span
                      className={`flex size-5.5 flex-none items-center justify-center rounded-full text-[11.5px] font-semibold ${
                        stage.done ? "bg-ru-blue-600 text-white" : "bg-ru-n-100 text-ru-n-500"
                      }`}
                    >
                      {stage.n}
                    </span>
                    <span className="flex-1 text-sm text-ru-n-700">{stage.name}</span>
                    <span className="text-[12.5px] text-ru-n-400">{stage.when}</span>
                  </div>
                ))}
              </div>
            </MockCard>
          </Panel>
        </div>

        <div
          role="tabpanel"
          id="broadcast-panel-REPORTING"
          aria-labelledby="broadcast-tab-REPORTING"
          hidden={active !== "REPORTING"}
        >
          <Panel
            hidden={false}
            title="Know what happened to every message"
            body="Campaign Performance shows sent, delivered, read, pending and failed. Resend to failed or pending contacts only, download the delivery report as Excel or ODS with a Stats sheet and a Participants sheet, and get an email plus in-app notification when the campaign completes. Before sending, a preflight check reads your plan's conversation allowance and warns you with the exact shortfall."
            tags={["Delivery report", "Resend failed", "Preflight check", "Completion alert"]}
          >
            <MockCard>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Campaign Performance</CardTitle>
                <Badge tone="accent">Completed</Badge>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { v: "12,400", l: "Sent", cls: "bg-ru-n-50 text-ru-n-700" },
                  { v: "12,061", l: "Delivered", cls: "bg-ru-green-50 text-ru-green-600" },
                  { v: "11,819", l: "Read", cls: "bg-ru-blue-50 text-ru-blue-600" },
                  { v: "96", l: "Pending", cls: "bg-ru-n-50 text-ru-n-500" },
                  {
                    v: "243",
                    l: "Failed",
                    cls: "bg-red-50 text-destructive dark:bg-red-950/30",
                  },
                ].map((cell) => (
                  <span
                    key={cell.l}
                    className={`flex flex-col gap-1 rounded-md px-2.5 py-3 ${cell.cls}`}
                  >
                    <span className="font-display text-[17px] font-bold tabular-nums">
                      {cell.v}
                    </span>
                    <span className="text-[11.5px] text-ru-n-400">{cell.l}</span>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {["Resend to failed", "Resend to pending"].map((label) => (
                  <span
                    key={label}
                    className="inline-flex h-8 items-center rounded-md bg-ru-n-100 px-3 text-sm font-medium text-ru-n-600"
                  >
                    {label}
                  </span>
                ))}
                <span className="inline-flex h-8 items-center rounded-md border border-ru-n-200 px-3 text-sm font-medium text-ru-n-600">
                  Download .xlsx
                </span>
              </div>
              <div className="flex gap-3 rounded-lg border border-ru-amber-200 bg-ru-amber-50 p-3.5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4.5 flex-none text-ru-amber-700"
                  aria-hidden="true"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
                <span className="flex flex-col gap-0.75">
                  <span className="text-sm font-medium text-ru-amber-700">
                    This campaign may not reach everyone
                  </span>
                  <span className="text-[13px] text-ru-n-500">
                    Preflight check: your plan is 1,180 marketing conversations short this month.
                  </span>
                </span>
              </div>
            </MockCard>
          </Panel>
        </div>
      </div>
    </section>
  );
}

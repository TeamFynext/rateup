import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";

import { BOOK_DEMO_ROUTE } from "@/components/RateupHomePage/helper/BookDemoLink";

import {
  LEADERS,
  LOYALTY_TABS,
  REFERRALS,
  SEGMENTS,
  TAB_COPY,
  WEEK_BARS,
  initials,
} from "./content";
import type { LoyaltyTab } from "./content";

/**
 * "Build customer profiles that actually mean something" — five tabs, each pairing a mock of the
 * dashboard screen with the copy that explains it.
 *
 * The panels stay in the DOM behind `hidden` rather than being swapped in on click: the copy in
 * the inactive tabs is the substance of the section, and a crawler does not click.
 *
 * The mock data carries literal hex from the `ru-*` ramp (see `content.ts`). That is data driving
 * an avatar tint or a bar fill, not styling — the only case the styling rules allow inline colour.
 */

const TAB_LABEL: Record<LoyaltyTab, string> = {
  profiles: "Profiles",
  segments: "Segments",
  campaigns: "Campaigns",
  referrals: "Referrals",
  analytics: "Analytics",
};

const TAB_ICON: Record<LoyaltyTab, ReactNode> = {
  profiles: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  segments: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M23 11h-6" />
    </>
  ),
  campaigns: (
    <>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M15 9a4 4 0 0 1 0 6" />
    </>
  ),
  referrals: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </>
  ),
  analytics: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
};

function Mock({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="rounded-2xl border border-ru-n-200 bg-ru-n-50 p-4">{children}</div>;
}

function Card({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="rounded-xl border border-ru-n-200 bg-white p-3.5">{children}</div>;
}

function CardHead({ icon, title, sub }: Readonly<{ icon: ReactNode; title: string; sub: string }>) {
  return (
    <>
      <div className="mb-0.75 flex items-center gap-2 text-sm font-semibold text-ru-n-700">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4.25 flex-none text-ru-blue-600"
          aria-hidden="true"
        >
          {icon}
        </svg>
        {title}
      </div>
      <div className="mb-2.5 text-xs text-ru-n-400">{sub}</div>
    </>
  );
}

/** Right-hand figure block in a mock row. */
function RowFigure({
  value,
  unit,
  warm,
}: Readonly<{ value: string; unit: string; warm?: boolean }>) {
  return (
    <div className="ml-auto flex-none text-right">
      <div
        className={`text-[13.5px] font-semibold tabular-nums ${warm ? "text-ru-amber-700" : "text-ru-n-700"}`}
      >
        {value}
      </div>
      <div className="text-[11.5px] text-ru-n-400">{unit}</div>
    </div>
  );
}

function Copy({ tab }: Readonly<{ tab: LoyaltyTab }>) {
  const copy = TAB_COPY[tab];
  return (
    <div>
      <h3 className="mb-3.5 font-display text-[clamp(1.625rem,3.4vw,2.375rem)]/[1.1] font-bold tracking-[-0.028em] text-ru-n-700">
        {copy.heading}
      </h3>
      <p className="mb-5 max-w-[46ch] text-[16.5px]/[1.6] text-ru-n-500">{copy.body}</p>
      <div className="mb-6 flex flex-wrap gap-2.25">
        {copy.pills.map((pill) => (
          <span
            key={pill}
            className="inline-flex items-center rounded-full border border-ru-n-200 bg-ru-n-50 px-3 py-1.5 text-[13.5px] text-ru-n-600"
          >
            {pill}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/signup"
          className="inline-flex h-11.5 items-center gap-2.25 rounded-lg bg-ru-blue-600 px-5 text-[15.5px] font-semibold text-white shadow-[0_8px_22px_rgba(28,81,142,0.18)] transition-colors hover:bg-ru-blue-700"
        >
          Get started
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 flex-none"
            aria-hidden="true"
          >
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </Link>
        <Link
          to={BOOK_DEMO_ROUTE}
          className="inline-flex h-11.5 items-center rounded-lg border border-ru-n-200 bg-white px-5 text-[15.5px] font-semibold text-ru-n-700 shadow-xs transition-colors hover:border-ru-n-300"
        >
          Know more
        </Link>
      </div>
    </div>
  );
}

function ProfilesMock() {
  const fields: readonly (readonly [string, string, boolean])[] = [
    ["Points", "4,680", true],
    ["Phone", "+91 72569 89899", false],
    ["Email", "meera@mail.com", false],
    ["Last order", "34 days ago", false],
    ["Engagement", "89%", false],
  ];
  return (
    <Mock>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <div className="flex flex-col items-center gap-1.75 border-b border-ru-n-100 pb-2.5">
            <span className="flex size-13 items-center justify-center rounded-full bg-ru-blue-600 text-[17px] font-semibold text-white">
              MN
            </span>
            <span className="text-[15px] font-semibold text-ru-n-700">Meera Nair</span>
            <span className="rounded-full border border-ru-n-200 px-2.5 py-0.75 text-[11.5px] text-ru-n-400">
              Referral code · MN4821
            </span>
          </div>
          {fields.map(([label, value, warm], i) => (
            <div
              key={label}
              className={`flex items-center justify-between gap-2.5 py-2 ${i === fields.length - 1 ? "" : "border-b border-ru-n-100"}`}
            >
              <span className="text-[12.5px] text-ru-n-400">{label}</span>
              <span
                className={`flex-none text-[13px] font-semibold tabular-nums ${warm ? "text-ru-amber-700" : "text-ru-n-700"}`}
              >
                {value}
              </span>
            </div>
          ))}
        </Card>
        <Card>
          <CardHead icon={TAB_ICON.referrals} title="Referrals" sub="Earned 500 points each" />
          {REFERRALS.map((referral, i) => (
            <div
              key={referral.name}
              className={`flex items-center gap-2.5 py-2 ${i === REFERRALS.length - 1 ? "" : "border-b border-ru-n-100"}`}
            >
              <span
                style={{ background: referral.colour }}
                className="flex size-7.5 flex-none items-center justify-center rounded-full text-[11.5px] font-semibold text-white"
              >
                {initials(referral.name)}
              </span>
              <div className="min-w-0">
                <div className="text-[13.5px]/[1.2] font-medium text-ru-n-700">{referral.name}</div>
                <div className="text-xs text-ru-n-400">Joined via link</div>
              </div>
              <RowFigure value={referral.points} unit="points" warm />
            </div>
          ))}
        </Card>
      </div>
    </Mock>
  );
}

function SegmentsMock() {
  return (
    <Mock>
      <Card>
        <CardHead
          icon={TAB_ICON.segments}
          title="Auto-generated segments"
          sub="Recalculated as customers engage"
        />
        {SEGMENTS.map((segment, i) => (
          <div
            key={segment.name}
            className={`flex items-center gap-2.5 py-2 ${i === SEGMENTS.length - 1 ? "" : "border-b border-ru-n-100"}`}
          >
            <span
              style={{ background: segment.colour }}
              className="size-2.25 flex-none rounded-full"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px]/[1.2] font-medium text-ru-n-700">{segment.name}</div>
              <div className="text-xs text-ru-n-400">{segment.desc}</div>
              <div className="mt-1.25 h-1.5 w-full max-w-27.5 overflow-hidden rounded-full bg-ru-n-100">
                <i
                  style={{ width: `${segment.pct}%`, background: segment.colour }}
                  className="block h-full rounded-full"
                />
              </div>
            </div>
            <RowFigure value={segment.count} unit="customers" />
          </div>
        ))}
      </Card>
    </Mock>
  );
}

function CampaignsMock() {
  return (
    <Mock>
      <Card>
        <CardHead
          icon={TAB_ICON.campaigns}
          title="Double points weekend"
          sub="Silver & Gold tiers · Kerala"
        />
        <div className="flex flex-col rounded-xl border border-ru-n-200 bg-white p-3">
          <div className="ml-auto max-w-[88%] self-end rounded-2xl rounded-br-xs bg-ru-blue-600 px-3.25 py-2.5 text-sm/[1.5] text-white">
            Hi {"{name}"} — this weekend earn <strong className="font-semibold">2× points</strong>{" "}
            on every order. Tap to shop and redeem.
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.75">
            {["Automated", "Targeted", "Scheduled"].map((pill) => (
              <span
                key={pill}
                className="inline-flex items-center rounded-full border border-ru-n-200 bg-ru-n-50 px-2.5 py-1.25 text-[12.5px] text-ru-n-600"
              >
                {pill}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-ru-n-200 bg-ru-n-200">
          {[
            ["4,200", "Delivered"],
            ["3,990", "Read · 95%"],
            ["1,470", "Clicked"],
          ].map(([n, l]) => (
            <div key={l} className="bg-white px-2 py-2.75 text-center">
              <div className="font-display text-base font-bold tabular-nums text-ru-n-700">{n}</div>
              <div className="mt-0.5 text-[11px] text-ru-n-400">{l}</div>
            </div>
          ))}
        </div>
      </Card>
    </Mock>
  );
}

function ReferralsMock() {
  return (
    <Mock>
      <Card>
        <CardHead
          icon={TAB_ICON.referrals}
          title="Top referrers this month"
          sub="500 points per successful referral"
        />
        {LEADERS.map((leader, i) => (
          <div
            key={leader.name}
            className={`flex items-center gap-2.5 py-2 ${i === LEADERS.length - 1 ? "" : "border-b border-ru-n-100"}`}
          >
            <span className="w-4.5 flex-none text-center text-[13px] font-semibold text-ru-n-400">
              {i + 1}
            </span>
            <span
              style={{ background: leader.colour }}
              className="flex size-7.5 flex-none items-center justify-center rounded-full text-[11.5px] font-semibold text-white"
            >
              {initials(leader.name)}
            </span>
            <div className="min-w-0">
              <div className="text-[13.5px]/[1.2] font-medium text-ru-n-700">{leader.name}</div>
              <div className="text-xs text-ru-n-400">{leader.referred} friends referred</div>
            </div>
            <RowFigure value={leader.points} unit="points" warm />
          </div>
        ))}
      </Card>
    </Mock>
  );
}

function AnalyticsMock() {
  return (
    <Mock>
      <Card>
        <CardHead
          icon={TAB_ICON.analytics}
          title="Loyalty performance"
          sub="Last 7 days · points issued"
        />
        <div className="mb-3.5 grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-ru-n-200 bg-ru-n-200">
          {[
            ["182K", "Points issued"],
            ["68%", "Redemption rate"],
            ["4.8", "Avg. rating"],
          ].map(([n, l]) => (
            <div key={l} className="bg-white p-3">
              <div className="font-display text-xl font-bold tracking-[-0.03em] tabular-nums text-ru-n-700">
                {n}
              </div>
              <div className="mt-0.75 text-[11.5px]/[1.25] text-ru-n-400">{l}</div>
            </div>
          ))}
        </div>
        <div className="flex h-26 items-end gap-1.75">
          {WEEK_BARS.map(([day, height], i) => (
            <div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <i
                style={{ height: `${height}%` }}
                className={`w-full rounded-t-[5px] ${i === WEEK_BARS.length - 1 ? "bg-ru-blue-600" : "bg-ru-blue-400"}`}
              />
              <span className="text-[11px] text-ru-n-400">{day}</span>
            </div>
          ))}
        </div>
      </Card>
    </Mock>
  );
}

const MOCKS: Record<LoyaltyTab, ReactNode> = {
  profiles: <ProfilesMock />,
  segments: <SegmentsMock />,
  campaigns: <CampaignsMock />,
  referrals: <ReferralsMock />,
  analytics: <AnalyticsMock />,
};

export default function ProfilePanel() {
  const [active, setActive] = useState<LoyaltyTab>("profiles");

  return (
    <section id="profiles" className="border-b border-ru-n-100 py-[clamp(3.5rem,8vw,6.5rem)]">
      <div className="mx-auto max-w-290 px-5">
        <div className="mx-auto mb-[clamp(2rem,4vw,3rem)] max-w-165 text-center">
          <div className="mb-3.5 text-[12.5px] font-semibold tracking-[0.1em] text-ru-blue-500 uppercase">
            The platform
          </div>
          <h2 className="mb-4 font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance text-ru-n-700">
            Build customer profiles that actually mean something.
          </h2>
          <p className="text-[clamp(1.0625rem,2vw,1.25rem)]/[1.6] text-pretty text-ru-n-500">
            Every order, rating, reply and redemption on one timeline — so you know exactly who to
            message today.
          </p>
        </div>

        <div className="rounded-[20px] border border-ru-n-200 bg-white p-[clamp(1.25rem,3vw,2rem)] shadow-sm">
          <div
            role="tablist"
            aria-label="Platform capabilities"
            className="mx-auto mb-[clamp(1.5rem,3vw,2rem)] flex w-fit max-w-full flex-wrap gap-1 rounded-xl bg-ru-n-100 p-1"
          >
            {LOYALTY_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`loyalty-tab-${tab}`}
                aria-selected={active === tab}
                aria-controls={`loyalty-panel-${tab}`}
                onClick={() => setActive(tab)}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                  active === tab ? "bg-white text-ru-n-700 shadow-xs" : "text-ru-n-500"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4.25"
                  aria-hidden="true"
                >
                  {TAB_ICON[tab]}
                </svg>
                {TAB_LABEL[tab]}
              </button>
            ))}
          </div>

          {LOYALTY_TABS.map((tab) => (
            <div
              key={tab}
              role="tabpanel"
              id={`loyalty-panel-${tab}`}
              aria-labelledby={`loyalty-tab-${tab}`}
              hidden={active !== tab}
              className="grid grid-cols-1 items-center gap-[clamp(1.75rem,4vw,3rem)] lg:grid-cols-[1.02fr_0.98fr]"
            >
              {MOCKS[tab]}
              <Copy tab={tab} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

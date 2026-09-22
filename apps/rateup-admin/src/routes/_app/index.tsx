import { IconCurrencyRupee, IconSearch } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { BlockChart } from "@/components/ds/block-chart";
import { Panel, SectionTitle } from "@/components/ds/panel";
import { SegmentedBar } from "@/components/ds/segmented-bar";
import { StatCard } from "@/components/ds/stat-card";
import { StatFigure, StatFigureRow } from "@/components/ds/stat-figure";
import { PageHeader } from "@/components/shell/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInitials } from "@/lib/initials";

export const Route = createFileRoute("/_app/")({
  component: Overview,
});

/*
 * SAMPLE DATA. The layout is final; the numbers are placeholders until Phase 2 exposes
 * GET /api/staff/overview (backed by rateup-api's getAdminOverview). Replace this block with
 * that query and delete the "Sample data" pill.
 */
const SAMPLE = {
  kpis: [
    {
      tone: "peach",
      value: "2,418",
      label: "Organisations",
      sub: "8% more than last month",
      trend: "up",
    },
    {
      tone: "mint",
      value: "312",
      label: "New signups",
      sub: "12% more than last month",
      trend: "up",
    },
    {
      tone: "sky",
      value: "641",
      label: "Paid orgs",
      sub: "3% fewer than last month",
      trend: "down",
    },
    {
      tone: "slate",
      value: "37",
      label: "Expiring in 14 days",
      sub: "5 more than last week",
      trend: "down",
    },
  ],
  mrr: { value: "₹18.4L", label: "Monthly recurring revenue", sub: "6% more than last month" },
  signups: [
    { label: "Jan", value: 180 },
    { label: "Feb", value: 240 },
    { label: "Mar", value: 150 },
    { label: "Apr", value: 230 },
    { label: "May", value: 160 },
    { label: "Jun", value: 300 },
    { label: "Jul", value: 150 },
    { label: "Aug", value: 210 },
    { label: "Sep", value: 110, partial: true },
  ],
  planMix: [
    { label: "Paid", value: 641 },
    { label: "Trial", value: 702 },
    { label: "Free", value: 1075 },
  ],
  topOrgs: [
    {
      id: "1",
      name: "Bloom Salons",
      owner: "priya@bloomsalons.in",
      conversations: 18_214,
      plan: "Pro",
    },
    {
      id: "2",
      name: "Cafe Arabica",
      owner: "omar@arabica.ae",
      conversations: 12_880,
      plan: "Growth",
    },
    { id: "3", name: "FitHub Gyms", owner: "ravi@fithub.co", conversations: 9_402, plan: "Pro" },
    {
      id: "4",
      name: "Kopi Corner",
      owner: "mei@kopicorner.sg",
      conversations: 7_655,
      plan: "Starter",
    },
  ],
  expiring: [
    { id: "5", name: "Urban Threads", plan: "Growth", days: 2 },
    { id: "6", name: "Spice Route Kitchen", plan: "Pro", days: 5 },
    { id: "7", name: "GlowUp Clinic", plan: "Starter", days: 9 },
    { id: "8", name: "Petal & Stem", plan: "Growth", days: 13 },
  ],
} as const;

/** Deterministic scatter points: conversations used vs plan ceiling, by plan. */
function scatterSeries(seed: number, count: number) {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: count }, (_, i) => ({ x: i + rand(), y: Math.round(rand() * 95) }));
}
const SCATTER = {
  paid: scatterSeries(7, 26),
  trial: scatterSeries(19, 22),
  free: scatterSeries(42, 20),
};

function Overview() {
  const [period, setPeriod] = useState("9m");

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            Platform overview
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Sample data
            </span>
          </span>
        }
        actions={
          <Select value={period} onValueChange={(value) => setPeriod(value ?? "9m")}>
            <SelectTrigger className="h-11 min-w-44 rounded-xl px-4 text-[13px] font-medium shadow-none">
              <SelectValue>
                {(value: string) =>
                  ({ "3m": "Last 3 months", "9m": "Last 9 months", "12m": "Last 12 months" })[value]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="9m">Last 9 months</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {SAMPLE.kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            tone={kpi.tone}
            value={kpi.value}
            label={kpi.label}
            sub={kpi.sub}
            trend={kpi.trend}
          />
        ))}
        <StatCard
          tone="ink"
          value={SAMPLE.mrr.value}
          label={SAMPLE.mrr.label}
          sub={SAMPLE.mrr.sub}
          badge={<IconCurrencyRupee className="size-4" stroke={1.75} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel className="flex flex-col gap-8">
          <BlockChart data={[...SAMPLE.signups]} />
          <StatFigureRow>
            <StatFigure value="2,418" label="Organisations" />
            <StatFigure value="6,930" label="Users" />
            <StatFigure value="1,204" label="Phone numbers" />
            <StatFigure value="+14%" label="Signup growth" trend="up" />
          </StatFigureRow>
        </Panel>

        <Panel className="flex flex-col gap-8">
          <div className="h-55 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="var(--border)" />
                <XAxis type="number" dataKey="x" hide domain={[0, 26]} />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <ZAxis range={[70, 70]} />
                <Scatter
                  data={SCATTER.paid}
                  fill="var(--chart-5)"
                  stroke="var(--background)"
                  strokeWidth={1}
                />
                <Scatter
                  data={SCATTER.trial}
                  fill="var(--chart-4)"
                  stroke="var(--background)"
                  strokeWidth={1}
                />
                <Scatter
                  data={SCATTER.free}
                  fill="var(--chart-3)"
                  stroke="var(--background)"
                  strokeWidth={1}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <SegmentedBar segments={[...SAMPLE.planMix]} />
          <StatFigureRow>
            <StatFigure value="641" label="Paid" dotClassName="bg-chart-5" />
            <StatFigure value="702" label="On trial" dotClassName="bg-chart-4" />
            <StatFigure value="1,075" label="Free" dotClassName="bg-chart-3" />
            <StatFigure value="+21%" label="Trial → paid" trend="up" />
          </StatFigureRow>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">
        <TopOrganisations />
        <ExpiringSoon />
      </div>
    </div>
  );
}

function ExpiringSoon() {
  return (
    <section className="flex flex-col gap-6">
      <SectionTitle
        action={
          <Link
            to="/orgs"
            className="text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground"
          >
            View all
          </Link>
        }
      >
        Expiring soon
      </SectionTitle>
      <ul className="flex flex-col divide-y">
        {SAMPLE.expiring.map((org) => (
          <li key={org.id} className="flex items-center gap-4 py-3.5 first:pt-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium">{org.name}</p>
              <p className="text-xs text-muted-foreground">{org.plan}</p>
            </div>
            <span
              className={
                org.days <= 3
                  ? "rounded-full bg-negative/10 px-3 py-1 text-xs font-medium text-negative"
                  : "rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
              }
            >
              {org.days} {Number(org.days) === 1 ? "day" : "days"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TopOrganisations() {
  const [query, setQuery] = useState("");
  const orgs = SAMPLE.topOrgs.filter((org) =>
    `${org.name} ${org.owner}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <section className="flex flex-col gap-6">
      <SectionTitle
        action={
          <label className="flex w-48 items-center gap-2 border-b pb-1.5 text-xs text-muted-foreground">
            <IconSearch className="size-3.5" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search organisations"
              className="w-full bg-transparent outline-none placeholder:text-muted-foreground/70"
            />
          </label>
        }
      >
        Top organisations
      </SectionTitle>
      <ul className="flex flex-col gap-5">
        {orgs.map((org) => (
          <li key={org.id}>
            <Link to="/orgs" className="flex items-center gap-4 rounded-2xl">
              <Avatar className="size-10">
                <AvatarFallback className="bg-muted text-xs font-medium">
                  {getInitials(org.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{org.name}</p>
                <p className="truncate text-xs text-muted-foreground">{org.owner}</p>
              </div>
              <span className="hidden text-xs font-medium sm:inline">{org.plan}</span>
              <span className="w-36 text-right text-[13px] font-medium tabular">
                {org.conversations.toLocaleString()} conv.
              </span>
            </Link>
          </li>
        ))}
        {orgs.length === 0 && <li className="text-sm text-muted-foreground">No matches.</li>}
      </ul>
    </section>
  );
}

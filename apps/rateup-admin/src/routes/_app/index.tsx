import { IconCurrencyRupee } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { z } from "zod";

import type { Overview as OverviewData } from "@/api/overview.api";
import { overviewQueryOptions } from "@/api/overview.query";
import { BlockChart } from "@/components/ds/block-chart";
import { EntityAvatar } from "@/components/ds/entity-avatar";
import { SectionHeading } from "@/components/ds/page-heading";
import { PageHeading } from "@/components/ds/page-heading";
import { Panel } from "@/components/ds/panel";
import { ErrorState } from "@/components/ds/query-states";
import { SegmentedBar, type Segment } from "@/components/ds/segmented-bar";
import { StatCard } from "@/components/ds/stat-card";
import { StatFigure, StatFigureRow } from "@/components/ds/stat-figure";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  daysUntil,
  formatCompact,
  formatNumber,
  formatRupees,
  formatRupeesCompact,
  monthLabel,
  percentChange,
} from "@/lib/format";

const PERIODS = [3, 6, 12, 24] as const;
const DEFAULT_MONTHS = 12;
/** The block chart stays readable up to a year of columns. */
const MAX_BLOCK_COLUMNS = 12;
/** On a phone twelve columns are too narrow to read; the last six are shown instead. */
const PHONE_BLOCK_COLUMNS = 6;

export const Route = createFileRoute("/_app/")({
  validateSearch: z.object({
    months: z.coerce
      .number()
      .refine((value) => (PERIODS as readonly number[]).includes(value))
      .optional()
      .catch(undefined),
  }),
  component: Overview,
});

function Overview() {
  const { months = DEFAULT_MONTHS } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const query = useQuery(overviewQueryOptions(months));

  return (
    <div className="flex flex-col gap-10">
      <PageHeading
        title="Overview"
        actions={
          <Select
            value={String(months)}
            onValueChange={(value) => {
              const next = Number(value);
              void navigate({
                search: { months: next === DEFAULT_MONTHS ? undefined : next },
                replace: true,
                resetScroll: false,
              });
            }}
          >
            <SelectTrigger className="h-9 min-w-44 rounded-lg px-4 text-[13px] font-medium shadow-none">
              <SelectValue>{(value: string) => `Last ${value} months`}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  Last {value} months
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {query.isPending ? (
        <OverviewSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <OverviewBody data={query.data} />
      )}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5 xl:gap-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-33.5 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

/** "12% more than last month", or nothing when last month had no base to compare. */
function changeLine(current: number, previous: number) {
  const change = percentChange(current, previous);
  if (change === null) return { sub: undefined, trend: undefined };
  return {
    sub: `${Math.abs(change)}% ${change >= 0 ? "more" : "fewer"} than last month`,
    trend: change >= 0 ? ("up" as const) : ("down" as const),
  };
}

/** The last two points of a monthly series: this month and the one before. */
function lastTwo(series: { value: number }[]) {
  return [series.at(-1)?.value ?? 0, series.at(-2)?.value ?? 0] as const;
}

const PLAN_FILLS = ["bg-chart-5", "bg-chart-4", "bg-chart-3", "bg-chart-2"];

/** The biggest three plans by org count, the rest folded into "Other". */
function planSegments(planMix: OverviewData["planMix"]): Segment[] {
  const sorted = [...planMix].sort((a, b) => b.orgs - a.orgs);
  const top = sorted.slice(0, 3).map((row) => ({ label: row.plan, value: row.orgs }));
  const other = sorted.slice(3).reduce((sum, row) => sum + row.orgs, 0);
  const segments = other > 0 ? [...top, { label: "Other", value: other }] : top;
  return segments.map((segment, index) => ({ ...segment, className: PLAN_FILLS[index] }));
}

function OverviewBody({ data }: { data: OverviewData }) {
  const { totals } = data;
  const [orgsThisMonth, orgsLastMonth] = lastTwo(data.signups.orgs);
  const orgChange = changeLine(orgsThisMonth, orgsLastMonth);
  const [revenueThisMonth] = lastTwo(data.revenue);
  const signupGrowth = percentChange(orgsThisMonth, orgsLastMonth);
  const segments = planSegments(data.planMix);
  const withYear = data.months > 12;
  const isPhone = useMediaQuery("(max-width: 639px)");
  const blockColumns = isPhone ? PHONE_BLOCK_COLUMNS : MAX_BLOCK_COLUMNS;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5 xl:gap-5">
        <StatCard
          tone="peach"
          value={formatNumber(totals.orgs)}
          label="Organisations"
          sub={`${formatNumber(orgsThisMonth)} new this month`}
        />
        <StatCard
          tone="mint"
          value={formatNumber(orgsThisMonth)}
          label="New this month"
          sub={orgChange.sub}
          trend={orgChange.trend}
        />
        <StatCard
          tone="sky"
          value={formatNumber(totals.paidSubscriptions)}
          label="Paid organisations"
          sub={totals.arpa ? `${formatRupees(totals.arpa)} a month each` : undefined}
        />
        <Link to="/orgs" search={{ view: "expiring" }} className="rounded-xl">
          <StatCard
            tone="slate"
            value={formatNumber(data.expiringSoon.total)}
            label={`Expiring in ${data.expiringSoon.windowDays} days`}
            sub="View the list"
            className="h-full"
          />
        </Link>
        <StatCard
          tone="brand"
          value={formatRupeesCompact(totals.mrr)}
          label="Monthly recurring revenue"
          sub={`${formatRupeesCompact(revenueThisMonth)} collected this month`}
          badge={<IconCurrencyRupee className="size-4" stroke={1.75} />}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel className="flex flex-col gap-8">
          <SectionHeading>Organisation signups</SectionHeading>
          <BlockChart
            data={data.signups.orgs.slice(-blockColumns).map((point, index, series) => ({
              label: monthLabel(point.month, withYear),
              value: point.value,
              // The current month is still filling up.
              partial: index === series.length - 1,
            }))}
          />
          <StatFigureRow>
            <StatFigure value={formatNumber(totals.orgs)} label="Organisations" />
            <StatFigure value={formatNumber(totals.users)} label="Users" />
            <StatFigure value={formatNumber(totals.activeUsers)} label="Active users" />
            <StatFigure
              value={signupGrowth === null ? "—" : `${signupGrowth > 0 ? "+" : ""}${signupGrowth}%`}
              label="Signups vs last month"
              trend={signupGrowth === null ? undefined : signupGrowth >= 0 ? "up" : "down"}
            />
          </StatFigureRow>
        </Panel>

        <Panel className="flex flex-col gap-8">
          <SectionHeading>Revenue</SectionHeading>
          <div className="h-55 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.revenue.map((point) => ({
                  label: monthLabel(point.month, withYear),
                  value: point.value,
                }))}
                margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(value: number) => formatCompact(value)}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-sm">
                        <p className="text-muted-foreground">{label}</p>
                        <p className="font-medium tabular">
                          {formatRupees(Number(payload[0].value))}
                        </p>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {segments.length > 0 && <SegmentedBar segments={segments} />}
          <StatFigureRow>
            {segments.map((segment) => (
              <StatFigure
                key={segment.label}
                value={formatNumber(segment.value)}
                label={segment.label}
                dotClassName={segment.className}
              />
            ))}
            {segments.length < 4 && (
              <StatFigure
                value={formatRupeesCompact(totals.revenueAllTime)}
                label="Revenue, all time"
              />
            )}
          </StatFigureRow>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">
        <TopOrganisations rows={data.topOrgsByConversations} />
        <ExpiringSoon data={data.expiringSoon} />
      </div>
    </>
  );
}

function TopOrganisations({ rows }: { rows: OverviewData["topOrgsByConversations"] }) {
  return (
    <section className="flex flex-col gap-6">
      <SectionHeading
        action={
          <Link
            to="/orgs"
            search={{ sort: "usage" }}
            className="text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground"
          >
            View all
          </Link>
        }
      >
        Most conversations this month
      </SectionHeading>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No conversations yet this month.</p>
      ) : (
        <ul className="flex flex-col gap-5">
          {rows.map((row) => (
            <li key={row.orgId}>
              <Link
                to="/orgs/$orgId"
                params={{ orgId: row.orgId }}
                className="flex items-center gap-4 rounded-lg"
              >
                <EntityAvatar name={row.org} />
                <p className="min-w-0 flex-1 truncate text-[15px] font-medium">{row.org}</p>
                <span className="shrink-0 text-right text-[13px] font-medium tabular">
                  {formatNumber(row.conversations)}
                  <span className="ml-1 font-normal text-muted-foreground">conv.</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ExpiringSoon({ data }: { data: OverviewData["expiringSoon"] }) {
  return (
    <section className="flex flex-col gap-6">
      <SectionHeading
        action={
          <Link
            to="/orgs"
            search={{ view: "expiring" }}
            className="text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground"
          >
            View all
          </Link>
        }
      >
        Expiring soon
      </SectionHeading>
      {data.orgs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing expires in the next {data.windowDays} days.
        </p>
      ) : (
        <ul className="flex flex-col divide-y">
          {data.orgs.map((org) => {
            const days = daysUntil(org.expiresAt) ?? 0;
            return (
              <li key={org.orgId}>
                <Link
                  to="/orgs/$orgId"
                  params={{ orgId: org.orgId }}
                  className="flex items-center gap-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{org.name}</p>
                    <p className="text-xs text-muted-foreground">{org.plan ?? "No plan"}</p>
                  </div>
                  <span
                    className={
                      days <= 3
                        ? "shrink-0 rounded-full bg-negative/10 px-3 py-1 text-xs font-medium text-negative"
                        : "shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                    }
                  >
                    {days <= 0 ? "Today" : `${days} ${days === 1 ? "day" : "days"}`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

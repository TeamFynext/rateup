import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@rateup/ui/components/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rateup/ui/components/table";
import { IconClock, IconPhone, IconPhoneCheck, IconPhoneX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { CallAnalytics } from "@/backend/whatsapp/calling/calling.api";
import { useCallAnalytics } from "@/backend/whatsapp/calling/calling.query";
import { StatTile } from "@/components/common/StatTile.tsx";
import { AnalyticsCard } from "@/components/dashboard/analytics/kit/AnalyticsCard.tsx";
import { formatCount, formatDuration } from "@/components/dashboard/analytics/kit/format.ts";
import { TileGroup } from "@/components/dashboard/analytics/kit/TileGroup.tsx";

import type { CallsScope } from "./CallsPage.tsx";

const ICON = "size-4 text-muted-foreground";

export default function CallAnalyticsTab({ scope }: Readonly<{ scope: CallsScope }>) {
  const { t } = useTranslation();
  const query = useCallAnalytics(scope);
  const data = query.data;
  const totals = data?.totals;
  const noCalls = (totals?.total ?? 0) === 0;

  return (
    <div className="flex flex-col gap-6">
      <TileGroup query={query} count={4}>
        <StatTile
          label={t("Calls")}
          value={formatCount(totals?.total)}
          note={t("{inbound} incoming · {outbound} outgoing", {
            inbound: totals?.inbound ?? 0,
            outbound: totals?.outbound ?? 0,
          })}
          icon={<IconPhone className={ICON} />}
        />
        <StatTile
          label={t("Answer rate")}
          value={
            totals?.answerRate === null || totals?.answerRate === undefined
              ? null
              : `${Math.round(totals.answerRate * 100)}%`
          }
          emptyValue={t("No incoming calls")}
          note={t("of incoming calls")}
          icon={<IconPhoneCheck className={ICON} />}
        />
        <StatTile
          label={t("Missed")}
          value={formatCount(totals?.missed)}
          note={
            totals && totals.missed > 0
              ? t("{count} called back", { count: totals.missedCalledBack })
              : undefined
          }
          icon={<IconPhoneX className={ICON} />}
        />
        <StatTile
          label={t("Avg call length")}
          value={formatDuration(totals?.avgDurationSeconds)}
          emptyValue={t("No answered calls")}
          note={
            totals?.avgAnswerSeconds !== null && totals?.avgAnswerSeconds !== undefined
              ? t("Picked up in {time} on average", {
                  time: formatDuration(totals.avgAnswerSeconds) ?? "0s",
                })
              : undefined
          }
          icon={<IconClock className={ICON} />}
        />
      </TileGroup>

      <AnalyticsCard
        title={t("Calls per day")}
        description={t("Answered against not answered (missed, declined or failed).")}
        query={query}
        isEmpty={noCalls}
        emptyTitle={t("No calls in this period")}
      >
        {data && <DailyChart daily={data.daily} />}
      </AnalyticsCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsCard
          title={t("Busiest hours")}
          description={t("Incoming calls by weekday and hour, in your time zone.")}
          query={query}
          isEmpty={(data?.hourly.length ?? 0) === 0}
          emptyTitle={t("No incoming calls in this period")}
        >
          {data && <HourHeatmap hourly={data.hourly} />}
        </AnalyticsCard>

        <AnalyticsCard
          title={t("Agents")}
          description={t("Answered and connected calls, by who handled them.")}
          query={query}
          isEmpty={(data?.agents.length ?? 0) === 0}
          emptyTitle={t("No answered calls in this period")}
        >
          {data && <AgentTable agents={data.agents} />}
        </AnalyticsCard>
      </div>
    </div>
  );
}

function DailyChart({ daily }: Readonly<{ daily: CallAnalytics["daily"] }>) {
  const { t } = useTranslation();
  // Answered against not answered: a meaning, not an identity, so "not answered" takes the
  // danger token — the same pairing as delivered/failed elsewhere in analytics.
  const config: ChartConfig = {
    answered: { label: t("Answered"), color: "var(--chart-2)" },
    missed: { label: t("Not answered"), color: "var(--destructive)" },
  };
  const formatDay = (value: string) => dayjs(value).format("D MMM");

  return (
    <ChartContainer config={config} className="h-60 w-full">
      <BarChart data={daily} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={formatDay}
        />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => (typeof label === "string" ? formatDay(label) : "")}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="answered" stackId="calls" fill="var(--color-answered)" maxBarSize={40} />
        <Bar
          dataKey="missed"
          stackId="calls"
          fill="var(--color-missed)"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ChartContainer>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Weekday × hour grid. Magnitude, so one hue stepping from faint to full; every cell also
 * carries its count in a tooltip and an accessible label, so colour is never the only cue.
 */
function HourHeatmap({ hourly }: Readonly<{ hourly: CallAnalytics["hourly"] }>) {
  const { t } = useTranslation();
  const counts = new Map(hourly.map((c) => [`${c.weekday}:${c.hour}`, c.calls]));
  const max = Math.max(1, ...hourly.map((c) => c.calls));
  const hourLabel = (hour: number) => dayjs().hour(hour).format("h A");

  return (
    <div className="overflow-x-auto">
      {/* A grid rather than a table: a table spreads its columns by content, and the
          labelled hours came out wider than the rest. Every hour is its own fixed cell. */}
      <div className="grid min-w-[520px] grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-0.5">
        <span />
        {Array.from({ length: 24 }, (_, hour) => (
          <span key={hour} className="text-center text-[10px] text-muted-foreground">
            {hour % 3 === 0 ? dayjs().hour(hour).format("hA").toLowerCase() : ""}
          </span>
        ))}
        {WEEKDAYS.map((day, weekday) => (
          <Fragment key={day}>
            <span className="flex items-center text-xs text-muted-foreground">{t(day)}</span>
            {Array.from({ length: 24 }, (_, hour) => {
              const calls = counts.get(`${weekday}:${hour}`) ?? 0;
              const label = t("{day} {hour}: {count} calls", {
                day: t(day),
                hour: hourLabel(hour),
                count: calls,
              });
              return (
                <span
                  key={hour}
                  role="img"
                  title={label}
                  aria-label={label}
                  className="h-6 rounded-sm bg-muted"
                  style={
                    calls > 0
                      ? {
                          // Data-driven intensity: one hue, never below a visible floor.
                          backgroundColor: `color-mix(in oklch, var(--chart-2) ${Math.round(25 + (calls / max) * 75)}%, transparent)`,
                        }
                      : undefined
                  }
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function AgentTable({ agents }: Readonly<{ agents: CallAnalytics["agents"] }>) {
  const { t } = useTranslation();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("Agent")}</TableHead>
          <TableHead className="text-right">{t("Calls")}</TableHead>
          <TableHead className="text-right">{t("Talk time")}</TableHead>
          <TableHead className="text-right">{t("Avg length")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map((agent) => (
          <TableRow key={agent.userId}>
            <TableCell className="font-medium text-foreground">
              {agent.name ?? t("Unknown agent")}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatCount(agent.calls)}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatDuration(agent.talkSeconds) ?? "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatDuration(agent.avgDurationSeconds) ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

import {
  IconChevronRight,
  IconClock,
  IconHeadset,
  IconMessageCircle,
  IconTarget,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useGetTemplateOverview } from "@/backend/apiAnalytics/apianalytics.query";
import {
  useGetConversationOverView,
  useGetConversationQuickStats,
  useGetResolvedConversationStats,
  useGetStaffPerformanceonConversation,
} from "@/backend/conversation/conversation.query";
import { StatTile } from "@/components/common/StatTile.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { previousRange } from "@/components/whatsapp/inbox/analytics/dateRangePresets.ts";
import { cn } from "@/lib/utils";

import { AnalyticsCard, AnalyticsError, combineQueries } from "../kit/AnalyticsCard.tsx";
import { TrendArea, TrendBars } from "../kit/charts.tsx";
import { type AnalyticsFilters, conversationFilter, deliveryFilter } from "../kit/filters.ts";
import {
  formatBucket,
  formatCount,
  formatDuration,
  formatPercent,
  type Numeric,
  percentChange,
  toNumber,
} from "../kit/format.ts";
import { TileGroup } from "../kit/TileGroup.tsx";
import { DeliveryTiles } from "../sections/DeliveryTiles.tsx";
import { DeliveryTrendCard } from "../sections/DeliveryTrendCard.tsx";
import { ResponseTimeCard } from "../sections/ResponseTimeCard.tsx";

const ICON = "size-4 text-muted-foreground";

/** A template needs this many sends before its failure rate means anything. */
const MIN_SENDS_FOR_FAILURE_RATE = 20;

function ConversationTiles({ filters }: Readonly<{ filters: AnalyticsFilters }>) {
  const { t } = useTranslation();
  const query = useGetConversationOverView(conversationFilter(filters));
  // The previous period is the same query over an earlier range, so it shares the
  // API's cache and needs no endpoint of its own.
  const previous = useGetConversationOverView({
    ...conversationFilter(filters),
    dateKey: "previous-period",
    dateRange: previousRange(filters.dateRange.range),
  });
  const now = query.data;
  const before = previous.data;
  const vsPrevious = t("vs previous period");

  const change = (current: Numeric, earlier: Numeric, goodWhen: "up" | "down") => {
    const value = percentChange(current, earlier);
    return value === null ? undefined : { value, goodWhen, label: vsPrevious };
  };
  const resolutionNow = toNumber(now?.resolutionRate);
  const resolutionBefore = toNumber(before?.resolutionRate);

  return (
    <TileGroup title={t("Conversations")} query={query} count={4}>
      <StatTile
        label={t("Conversations")}
        value={formatCount(now?.totalConversations)}
        icon={<IconMessageCircle className={ICON} />}
        change={change(now?.totalConversations, before?.totalConversations, "up")}
      />
      <StatTile
        label={t("First response")}
        value={formatDuration(now?.averageResponseTime)}
        emptyValue={t("No replies yet")}
        note={t("Any reply, including automations")}
        icon={<IconClock className={ICON} />}
        change={change(now?.averageResponseTime, before?.averageResponseTime, "down")}
      />
      <StatTile
        label={t("Agent response")}
        value={formatDuration(now?.averageResponseTimeByAgent)}
        emptyValue={t("No replies yet")}
        note={t("First reply from a person")}
        icon={<IconHeadset className={ICON} />}
        change={change(now?.averageResponseTimeByAgent, before?.averageResponseTimeByAgent, "down")}
      />
      <StatTile
        label={t("Resolution rate")}
        value={formatPercent(now?.resolutionRate)}
        icon={<IconTarget className={ICON} />}
        change={
          resolutionNow === null || resolutionBefore === null
            ? undefined
            : {
                value: resolutionNow - resolutionBefore,
                goodWhen: "up",
                label: vsPrevious,
                unit: " pts",
              }
        }
      />
    </TileGroup>
  );
}

function LiveStat({
  label,
  value,
  note,
}: Readonly<{ label: string; value: ReactNode; note?: ReactNode }>) {
  return (
    <div className="flex flex-col gap-1 py-1 lg:px-4 lg:first:ps-0">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-xl font-semibold tabular-nums text-foreground">{value}</span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
  );
}

/** Counts as of now. They ignore the date range, and say so. */
function LiveStrip({ filters }: Readonly<{ filters: AnalyticsFilters }>) {
  const { t } = useTranslation();
  const query = useGetConversationQuickStats({ teamId: filters.teamId });
  const data = query.data;
  const difference = toNumber(data?.resolvedRateDifference);

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {t("Right now")}
          <Badge variant="outline" className="gap-1.5 font-normal">
            <span className="size-1.5 animate-pulse rounded-full bg-green-500" aria-hidden />
            {t("Live")}
          </Badge>
          <span className="text-xs font-normal text-muted-foreground">
            {t("Not affected by the date range")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        {query.isPending ? (
          <Skeleton className="h-14 w-full" />
        ) : query.isError ? (
          <AnalyticsError query={query} />
        ) : (
          <div className="grid grid-cols-2 gap-y-4 lg:grid-cols-4 lg:divide-x lg:divide-border rtl:lg:divide-x-reverse">
            <LiveStat
              label={t("Unassigned")}
              value={formatCount(data?.newConversations)}
              note={filters.teamId !== "all" ? t("All teams") : undefined}
            />
            <LiveStat label={t("In progress")} value={formatCount(data?.conversationInProgress)} />
            <LiveStat
              label={t("Agents online")}
              value={`${formatCount(data?.staffOnline)} / ${formatCount(data?.totalStaff)}`}
            />
            <LiveStat
              label={t("Resolved to date")}
              value={formatCount(data?.resolved)}
              note={
                difference === null || difference === 0 ? undefined : (
                  <span
                    className={cn(
                      difference > 0 ? "text-green-700 dark:text-green-500" : "text-destructive",
                    )}
                  >
                    {difference > 0 ? "+" : ""}
                    {Number(difference.toFixed(1))} {t("pts resolved rate vs last week")}
                  </span>
                )
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Resolved and open conversations as small multiples: two single-series charts on the
 * same x-axis rather than two series in one frame, which the ramp palette cannot separate.
 */
function ConversationVolume({ filters }: Readonly<{ filters: AnalyticsFilters }>) {
  const { t } = useTranslation();
  const query = useGetResolvedConversationStats({ days: 7, ...conversationFilter(filters) });
  const data = query.data ?? [];
  const formatX = (value: string) => formatBucket(value, "day");

  return (
    <>
      <AnalyticsCard
        title={t("Resolved per day")}
        description={t("Conversations closed or resolved each day")}
        query={query}
        isEmpty={data.every((day) => !day.resolvedCount)}
        emptyTitle={t("Nothing resolved in this range")}
      >
        <TrendBars
          data={data}
          xKey="date"
          yKey="resolvedCount"
          label={t("Resolved")}
          formatX={formatX}
        />
      </AnalyticsCard>
      <AnalyticsCard
        title={t("Open conversations")}
        description={t("Still waiting on a resolution at the end of each day")}
        query={query}
        isEmpty={data.every((day) => !day.totalCount)}
        emptyTitle={t("No open conversations in this range")}
      >
        <TrendArea data={data} xKey="date" yKey="totalCount" label={t("Open")} formatX={formatX} />
      </AnalyticsCard>
    </>
  );
}

const ATTENTION_ROW = "-mx-2 flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted";

function AttentionRowContent({
  label,
  secondary,
  value,
}: Readonly<{ label: string; secondary?: string; value: string }>) {
  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium text-foreground">{label}</span>
        {secondary && <span className="truncate text-xs text-muted-foreground">{secondary}</span>}
      </span>
      <span className="shrink-0 tabular-nums text-foreground">{value}</span>
      <IconChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" />
    </>
  );
}

function NeedsAttention({ filters }: Readonly<{ filters: AnalyticsFilters }>) {
  const { t } = useTranslation();
  const staffQuery = useGetStaffPerformanceonConversation(conversationFilter(filters));
  const templateQuery = useGetTemplateOverview(deliveryFilter(filters));

  const slowestAgents = (staffQuery.data ?? [])
    .map((agent) => ({ agent, seconds: toNumber(agent.averageResponseTime) }))
    .filter((row): row is { agent: typeof row.agent; seconds: number } => row.seconds !== null)
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 3);

  const failingTemplates = (templateQuery.data?.templatePerformance ?? [])
    .filter(
      (template) =>
        (toNumber(template.totalSent) ?? 0) >= MIN_SENDS_FOR_FAILURE_RATE &&
        (toNumber(template.failurePercentage) ?? 0) > 0,
    )
    .sort((a, b) => (toNumber(b.failurePercentage) ?? 0) - (toNumber(a.failurePercentage) ?? 0))
    .slice(0, 3);

  return (
    <AnalyticsCard
      title={t("Needs attention")}
      description={t("Where to look first in this range")}
      query={combineQueries(staffQuery, templateQuery)}
      isEmpty={slowestAgents.length === 0 && failingTemplates.length === 0}
      emptyTitle={t("Nothing stands out")}
      emptyDescription={t("No agent replies or template failures to review in this range.")}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {slowestAgents.length > 0 && (
          <section className="flex flex-col gap-1">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t("Slowest first response")}
            </h3>
            <ul>
              {slowestAgents.map(({ agent, seconds }) => (
                <li key={agent.staff.userId}>
                  <Link
                    to="/dashboard/analytics/$staffid"
                    params={{ staffid: agent.staff.userId }}
                    className={ATTENTION_ROW}
                  >
                    <AttentionRowContent
                      label={agent.staff.name}
                      secondary={agent.staff.email}
                      value={formatDuration(seconds) ?? ""}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {failingTemplates.length > 0 && (
          <section className="flex flex-col gap-1">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t("Highest template failure rate")}
            </h3>
            <ul>
              {failingTemplates.map((template) => (
                <li key={template.templateName}>
                  <Link
                    to="/dashboard/analytics"
                    search={{ tab: "messages" }}
                    className={ATTENTION_ROW}
                  >
                    <AttentionRowContent
                      label={template.templateName}
                      secondary={t("{count} sent", { count: toNumber(template.totalSent) ?? 0 })}
                      value={formatPercent(template.failurePercentage) ?? ""}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AnalyticsCard>
  );
}

export function OverviewView({ filters }: Readonly<{ filters: AnalyticsFilters }>) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
      <LiveStrip filters={filters} />
      <ConversationTiles filters={filters} />
      <DeliveryTiles filters={filters} title={t("WhatsApp delivery")} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ConversationVolume filters={filters} />
        <ResponseTimeCard filters={filters} />
        <DeliveryTrendCard filters={filters} />
      </div>
      <NeedsAttention filters={filters} />
    </div>
  );
}

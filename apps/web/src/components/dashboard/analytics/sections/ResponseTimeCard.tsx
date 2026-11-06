import { useTranslation } from "react-i18next";

import { useGetAverageConversationResponseTimeGraphData } from "@/backend/conversation/conversation.query";

import { AnalyticsCard } from "../kit/AnalyticsCard.tsx";
import { TrendArea } from "../kit/charts.tsx";
import { type AnalyticsFilters, conversationFilter } from "../kit/filters.ts";
import { formatBucket, formatDuration, granularityFor, toNumber } from "../kit/format.ts";

export function ResponseTimeCard({ filters }: Readonly<{ filters: AnalyticsFilters }>) {
  const { t } = useTranslation();
  const query = useGetAverageConversationResponseTimeGraphData(conversationFilter(filters));
  const granularity = granularityFor(filters.dateRange.key);
  const data = (query.data ?? []).map((point) => ({
    period: point.period,
    seconds: toNumber(point.averageResponseTime) ?? 0,
  }));

  return (
    <AnalyticsCard
      title={t("Response time")}
      description={
        granularity === "hour"
          ? t("Average first response, by hour the conversation started")
          : t("Average first response, by day the conversation started")
      }
      query={query}
      isEmpty={data.length === 0}
      emptyTitle={t("No replies yet")}
      emptyDescription={t("No conversation in this range has had a first response.")}
    >
      <TrendArea
        data={data}
        xKey="period"
        yKey="seconds"
        label={t("Avg first response")}
        formatX={(value) => formatBucket(value, granularity)}
        formatY={(value) => formatDuration(value) ?? ""}
      />
    </AnalyticsCard>
  );
}

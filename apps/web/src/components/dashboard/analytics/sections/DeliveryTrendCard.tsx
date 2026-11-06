import { useTranslation } from "react-i18next";

import { useGetDeliveredFailedTrend } from "@/backend/apiAnalytics/apianalytics.query";

import { AnalyticsCard } from "../kit/AnalyticsCard.tsx";
import { DeliveryBars } from "../kit/charts.tsx";
import { type AnalyticsFilters, deliveryFilter } from "../kit/filters.ts";
import { formatBucket } from "../kit/format.ts";

export function DeliveryTrendCard({
  filters,
  className,
}: Readonly<{ filters: AnalyticsFilters; className?: string }>) {
  const { t } = useTranslation();
  const query = useGetDeliveredFailedTrend(deliveryFilter(filters));
  const granularity = query.data?.granularity === "hour" ? "hour" : "day";
  const data = query.data?.trend ?? [];
  const isEmpty = data.every((point) => !point.deliveredMessages && !point.failedMessages);

  return (
    <AnalyticsCard
      className={className}
      title={t("Delivery trend")}
      description={
        granularity === "hour"
          ? t("Outbound WhatsApp messages per hour")
          : t("Outbound WhatsApp messages per day")
      }
      query={query}
      isEmpty={isEmpty}
      emptyTitle={t("No messages sent in this range")}
    >
      <DeliveryBars
        data={data}
        xKey="time"
        labels={{ delivered: t("Delivered"), failed: t("Failed") }}
        formatX={(value) => formatBucket(value, granularity)}
      />
    </AnalyticsCard>
  );
}

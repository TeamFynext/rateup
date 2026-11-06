import { IconBolt, IconCircleCheck, IconCircleX, IconSend } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useGetApiAnlayticsOverview } from "@/backend/apiAnalytics/apianalytics.query";
import { StatTile } from "@/components/common/StatTile.tsx";

import { type AnalyticsFilters, deliveryFilter } from "../kit/filters.ts";
import { formatCount, formatDuration, formatPercent, toNumber } from "../kit/format.ts";
import { TileGroup } from "../kit/TileGroup.tsx";

const ICON = "size-4 text-muted-foreground";

export function DeliveryTiles({
  filters,
  title,
}: Readonly<{ filters: AnalyticsFilters; title?: string }>) {
  const { t } = useTranslation();
  const query = useGetApiAnlayticsOverview(deliveryFilter(filters));
  const data = query.data;
  const vsPrevious = t("vs previous period");
  const totalChange = toNumber(data?.totalMessagesChange);
  const timeChange = toNumber(data?.avgDeliveryTimeChange);
  const avgDelivery = toNumber(data?.avgDeliveryTimeSeconds);

  return (
    <TileGroup title={title} query={query} count={4}>
      <StatTile
        label={t("Messages sent")}
        value={formatCount(data?.totalMessages)}
        icon={<IconSend className={ICON} />}
        change={
          totalChange === null
            ? undefined
            : { value: totalChange, goodWhen: "up", label: vsPrevious }
        }
      />
      <StatTile
        label={t("Delivered")}
        value={formatPercent(data?.deliveredPercentage)}
        emptyValue={t("Nothing sent")}
        note={t("{count} messages", { count: toNumber(data?.deliveredMessages) ?? 0 })}
        icon={<IconCircleCheck className={ICON} />}
      />
      <StatTile
        label={t("Failed")}
        value={formatCount(data?.failedMessages)}
        note={
          formatPercent(data?.failedPercentage)
            ? t("{percent} of sent", { percent: formatPercent(data?.failedPercentage) })
            : undefined
        }
        icon={<IconCircleX className={ICON} />}
      />
      <StatTile
        label={t("Avg delivery time")}
        // The server reports seconds to a decimal; below a second, "0s" would read as instant.
        value={avgDelivery !== null && avgDelivery < 1 ? "<1s" : formatDuration(avgDelivery)}
        emptyValue={t("Nothing delivered")}
        icon={<IconBolt className={ICON} />}
        change={
          timeChange === null
            ? undefined
            : { value: timeChange, goodWhen: "down", label: vsPrevious }
        }
      />
    </TileGroup>
  );
}

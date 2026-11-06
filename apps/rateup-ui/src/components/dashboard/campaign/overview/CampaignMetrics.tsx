import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils";

export interface CampaignMetric {
  label: string;
  value: number;
  /** Share of the row above it in the funnel, rendered as the chip. */
  rate: number | null;
  sub: string;
  tone: "neutral" | "good" | "bad";
}

const VALUE_TONE = {
  neutral: "text-foreground",
  good: "text-foreground",
  bad: "text-destructive",
} as const;

const CHIP_TONE = {
  neutral: "bg-muted text-muted-foreground",
  good: "bg-green-600/10 text-green-700 dark:text-green-500",
  bad: "bg-destructive/10 text-destructive",
} as const;

/**
 * The five numbers across the top of Overview.
 *
 * Each carries its rate against the previous stage rather than a period-on-period
 * delta: a campaign is a one-off, so "up 12% on last week" is meaningless, while
 * "90% of what was sent" is the actual question.
 */
export function CampaignMetrics({
  metrics,
  isLoading,
}: Readonly<{ metrics: CampaignMetric[]; isLoading: boolean }>) {
  const { t } = useTranslation("campaign.details");

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="bg-card ring-foreground/10 flex flex-col gap-2 rounded-xl px-5 py-4.5 shadow-xs ring-1"
        >
          <span className="text-muted-foreground text-[12.5px] font-medium">{metric.label}</span>
          <span
            className={cn(
              "font-display text-3xl leading-none font-bold tracking-tight tabular-nums",
              VALUE_TONE[metric.tone],
            )}
          >
            {metric.value.toLocaleString()}
          </span>
          <div className="mt-0.5 flex items-center gap-2">
            {metric.rate === null ? null : (
              <Badge variant="secondary" className={CHIP_TONE[metric.tone]}>
                {`${(metric.rate * 100).toFixed(metric.rate >= 0.995 ? 0 : 1)}%`}
              </Badge>
            )}
            <span className="text-muted-foreground/70 truncate text-xs">{t(metric.sub)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

import type { TFunction } from "i18next";

import type { FeedbackResults } from "@/backend/loyalty/feedback.api.ts";

import type { MetricTile } from "../overview/metricTiles.ts";

/**
 * The six tiles on the results tab. There is no previous-period comparison for feedback
 * yet, so every tile's delta is hidden and the second line carries the denominator.
 */
export function buildFeedbackMetricTiles(
  t: TFunction,
  metrics: FeedbackResults["metrics"] | undefined,
): MetricTile[] {
  if (!metrics) return [];

  const percent = (rate: number | null) => (rate === null ? "—" : `${Math.round(rate * 100)}%`);
  const tile = (id: string, label: string, value: string, note: string): MetricTile => ({
    id,
    label,
    value,
    delta: null,
    deltaTone: "neutral",
    note,
  });

  return [
    tile("sent", t("Asked"), metrics.sent.toLocaleString(), t("Feedback requests delivered")),
    tile(
      "completed",
      t("Answered"),
      metrics.completed.toLocaleString(),
      t("{completed} of {sent} finished the survey", {
        completed: metrics.completed,
        sent: metrics.sent,
      }),
    ),
    tile(
      "completion_rate",
      t("Completion rate"),
      percent(metrics.completionRate),
      t("Share of asks that were answered"),
    ),
    tile(
      "happy_rate",
      t("Happy"),
      percent(metrics.happyRate),
      t("{happy} rated you above the threshold", { happy: metrics.happy }),
    ),
    tile(
      "review_clicks",
      t("Review link taps"),
      metrics.reviewClicks.toLocaleString(),
      t("Happy customers who opened Google"),
    ),
    tile(
      "rewards_granted",
      t("Rewards granted"),
      metrics.rewardsGranted.toLocaleString(),
      t("One per customer, on their first tap"),
    ),
  ];
}

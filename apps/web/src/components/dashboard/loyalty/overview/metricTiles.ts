import type { TFunction } from "i18next";

import type {
  LoyaltyDashboardStats,
  PeriodMetric,
  PeriodRate,
} from "@/backend/loyalty/dashboard/dashboard.query";

import type { GivebackResult } from "../giveback/calculateGiveback";
import { formatMoney, formatPercent } from "../giveback/format";
import type { ProgramState } from "../program/programState.ts";

/**
 * The six metric tiles on a live Overview, and the three honest placeholders on a draft.
 * Every tile carries the previous-period comparison and a second line that translates
 * points into money — the number an owner repeats to their staff.
 */

export interface MetricTile {
  id: string;
  label: string;
  value: string;
  /** "↑ 14%" — null hides the chip. */
  delta: string | null;
  /** How the delta should read: up is usually good, but a rising liability is a warning. */
  deltaTone: "good" | "bad" | "warning" | "neutral";
  note: string;
}

export interface MetricTilesInput {
  t: TFunction;
  programState: ProgramState;
  pointsName: string;
  currencySymbol: string;
  currencyCode: string;
  dashboard: LoyaltyDashboardStats | undefined;
  giveback: GivebackResult;
}

function deltaOf(metric: PeriodMetric | PeriodRate, unit: "pct" | "pts"): string | null {
  if (metric.changePct === null) return null;
  if (unit === "pts") {
    // Rates compare in points of percentage, not relative percent.
    if (metric.current === null || metric.previous === null) return null;
    const pts = Math.round((metric.current - metric.previous) * 10) / 10;
    return `${pts >= 0 ? "↑" : "↓"} ${Math.abs(pts)} pts`;
  }
  return `${metric.changePct >= 0 ? "↑" : "↓"} ${Math.abs(metric.changePct)}%`;
}

function tone(metric: PeriodMetric | PeriodRate, invert = false): MetricTile["deltaTone"] {
  if (metric.changePct === null) return "neutral";
  const up = metric.changePct >= 0;
  if (invert) return up ? "warning" : "good";
  return up ? "good" : "bad";
}

export function buildMetricTiles({
  t,
  programState,
  pointsName,
  currencySymbol,
  currencyCode,
  dashboard,
  giveback,
}: MetricTilesInput): MetricTile[] {
  const money = (amount: number) => formatMoney(amount, currencyCode, currencySymbol);

  if (programState === "draft") {
    return [
      {
        id: "members",
        label: t("Members"),
        value: "—",
        delta: null,
        deltaTone: "neutral",
        note: t("Starts counting when you activate"),
      },
      {
        id: "revenue",
        label: t("Revenue on loyalty transactions"),
        value: "—",
        delta: null,
        deltaTone: "neutral",
        note: t("Needs a week of trading to be useful"),
      },
      {
        id: "liability",
        label: t("Outstanding {points} liability", { points: pointsName }),
        value: money(0),
        delta: null,
        deltaTone: "neutral",
        note: t("No {points} have been issued yet", { points: pointsName }),
      },
    ];
  }

  if (!dashboard) return [];

  const { metrics, liability } = dashboard;
  const pointValue = giveback.pointValue?.best ?? dashboard.giveback.pointValue?.best ?? null;

  return [
    {
      id: "revenue",
      label: t("Revenue on loyalty transactions"),
      value: money(metrics.revenue.current),
      delta: deltaOf(metrics.revenue, "pct"),
      deltaTone: tone(metrics.revenue),
      note: t("{previous} before", { previous: money(metrics.revenue.previous) }),
    },
    {
      id: "liability",
      label: t("Outstanding {points} liability", { points: pointsName }),
      value: liability.monetaryValue === null ? "—" : money(liability.monetaryValue),
      delta: null,
      deltaTone: "neutral",
      note: liability.enablePointsExpiration
        ? t("{points} unspent · expire after {months} months", {
            points: liability.outstandingPoints.toLocaleString(),
            months: liability.pointsExpirationMonths,
          })
        : t("{points} unspent · never expire", {
            points: liability.outstandingPoints.toLocaleString(),
          }),
    },
    {
      id: "repeat",
      label: t("Repeat visit rate"),
      value:
        metrics.repeatVisitRate.current === null
          ? "—"
          : formatPercent(metrics.repeatVisitRate.current),
      delta: deltaOf(metrics.repeatVisitRate, "pts"),
      deltaTone: tone(metrics.repeatVisitRate),
      note:
        metrics.repeatVisitRate.previous === null
          ? t("Members buying twice or more in the period")
          : t("Members buying twice or more · {previous} before", {
              previous: formatPercent(metrics.repeatVisitRate.previous),
            }),
    },
    {
      id: "issued",
      label: t("{points} issued", { points: pointsName }),
      value: metrics.pointsIssued.current.toLocaleString(),
      delta: deltaOf(metrics.pointsIssued, "pct"),
      deltaTone: tone(metrics.pointsIssued),
      note:
        pointValue !== null
          ? t("≈ {value} of value handed out", {
              value: money(Math.round(metrics.pointsIssued.current * pointValue)),
            })
          : t("Add a priced reward to value these"),
    },
    {
      id: "redeemed",
      label: t("{points} redeemed", { points: pointsName }),
      value: metrics.pointsRedeemed.current.toLocaleString(),
      delta: deltaOf(metrics.pointsRedeemed, "pct"),
      deltaTone: tone(metrics.pointsRedeemed),
      note: t("{count} rewards handed over", { count: metrics.rewardsRedeemed.current }),
    },
    {
      id: "redemption_rate",
      label: t("Redemption rate"),
      value:
        metrics.redemptionRate.current === null
          ? "—"
          : formatPercent(metrics.redemptionRate.current),
      delta: deltaOf(metrics.redemptionRate, "pts"),
      deltaTone: tone(metrics.redemptionRate),
      note: t("Of {points} issued · a healthy program sits near 40%", { points: pointsName }),
    },
  ];
}

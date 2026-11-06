import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Period maths for the loyalty Overview: the current window, the previous window of the
 * same length, and how the current window is bucketed for charts. Pure — no Prisma — so
 * it is tested on its own.
 *
 * Bounds are half-open `[start, end)`. Days are cut in the caller's IANA zone: there is no
 * org-level timezone in the schema, so the browser sends its own and UTC is the default.
 */

export const DASHBOARD_PERIODS = ["30d", "90d", "12m"] as const;
export type DashboardPeriodKey = (typeof DASHBOARD_PERIODS)[number];
export type DashboardGranularity = "week" | "month";

export interface ResolvedPeriod {
  key: DashboardPeriodKey;
  /** Length of one window in days (a year for `12m`). */
  days: number;
  granularity: DashboardGranularity;
  tz: string;
  current: { start: Date; end: Date };
  previous: { start: Date; end: Date };
  /** "Last 30 days" / "Last 12 months". */
  label: string;
  /** "vs 6 Jul – 4 Aug", rendered in `tz` with the end made inclusive. */
  comparisonLabel: string;
  /** Bucket starts for the current window, oldest first; the last one may be partial. */
  buckets: Array<{ start: Date; label: string }>;
}

const PERIOD_DAYS: Record<DashboardPeriodKey, number> = { "30d": 30, "90d": 90, "12m": 365 };

/**
 * `Intl.supportedValuesOf("timeZone")` lists canonical names only, so an alias the
 * browser legitimately reports (Asia/Kolkata for Asia/Calcutta) would fail it. Asking
 * `DateTimeFormat` accepts aliases and throws on nonsense, which is the check wanted.
 */
export function isValidTimeZone(tz: string): boolean {
  if (tz === "UTC") return true;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Legacy `?days=` values from older clients map onto the nearest period. */
export function periodKeyFromDays(days: number | undefined): DashboardPeriodKey | undefined {
  if (days === undefined) return undefined;
  if (days <= 30) return "30d";
  if (days <= 90) return "90d";
  return "12m";
}

export function resolvePeriod(key: DashboardPeriodKey, now: Date, tz = "UTC"): ResolvedPeriod {
  const zone = isValidTimeZone(tz) ? tz : "UTC";
  const local = dayjs(now).tz(zone);

  if (key === "12m") {
    const end = local.startOf("month").add(1, "month");
    const start = end.subtract(12, "month");
    const previousStart = start.subtract(12, "month");
    const buckets = Array.from({ length: 12 }, (_, i) => {
      const b = start.add(i, "month");
      return { start: b.toDate(), label: b.format("MMM YYYY") };
    });
    return {
      key,
      days: PERIOD_DAYS[key],
      granularity: "month",
      tz: zone,
      current: { start: start.toDate(), end: end.toDate() },
      previous: { start: previousStart.toDate(), end: start.toDate() },
      label: "Last 12 months",
      comparisonLabel: `vs ${previousStart.format("MMM YYYY")} – ${start.subtract(1, "month").format("MMM YYYY")}`,
      buckets,
    };
  }

  const days = PERIOD_DAYS[key];
  // Today is included, so the window ends at tomorrow's midnight.
  const end = local.startOf("day").add(1, "day");
  const start = end.subtract(days, "day");
  const previousStart = start.subtract(days, "day");

  const buckets: ResolvedPeriod["buckets"] = [];
  for (let b = start; b.isBefore(end); b = b.add(7, "day")) {
    buckets.push({ start: b.toDate(), label: b.format("D MMM") });
  }

  return {
    key,
    days,
    granularity: "week",
    tz: zone,
    current: { start: start.toDate(), end: end.toDate() },
    previous: { start: previousStart.toDate(), end: start.toDate() },
    label: `Last ${days} days`,
    comparisonLabel: `vs ${previousStart.format("D MMM")} – ${start.subtract(1, "day").format("D MMM")}`,
    buckets,
  };
}

/**
 * Which bucket a local calendar day (`YYYY-MM-DD`, already cut in `tz`) belongs to.
 * Returns -1 for a day outside the window.
 */
export function bucketIndexForDay(period: ResolvedPeriod, day: string): number {
  // dayjs.tz throws on a malformed string rather than returning an invalid date.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return -1;
  const d = dayjs.tz(day, period.tz);
  if (!d.isValid()) return -1;
  for (let i = period.buckets.length - 1; i >= 0; i--) {
    const start = dayjs(period.buckets[i].start).tz(period.tz);
    if (!d.isBefore(start, "day")) {
      return dayjs(period.current.end).tz(period.tz).isAfter(d, "day") ? i : -1;
    }
  }
  return -1;
}

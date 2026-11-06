import dayjs from "dayjs";

/**
 * Number formatting for the analytics views.
 *
 * Aggregates from raw SQL can arrive as strings (Postgres `numeric` survives JSON as
 * text) or null (an average over no rows), so every helper takes either and answers
 * null when there is nothing to show — the caller decides how to say so.
 */
export type Numeric = number | string | null | undefined;

export function toNumber(value: Numeric): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function formatCount(value: Numeric): string {
  return (toNumber(value) ?? 0).toLocaleString();
}

export function formatPercent(value: Numeric, digits = 1): string | null {
  const number = toNumber(value);
  return number === null ? null : `${Number(number.toFixed(digits))}%`;
}

/** "45s", "3m 20s", "2h 5m", "3d 4h": the two largest units, which is all a glance needs. */
export function formatDuration(seconds: Numeric): string | null {
  const number = toNumber(seconds);
  if (number === null || number < 0) return null;
  const total = Math.round(number);
  if (total < 60) return `${total}s`;
  const units: [string, number][] = [
    ["d", Math.floor(total / 86_400)],
    ["h", Math.floor((total % 86_400) / 3_600)],
    ["m", Math.floor((total % 3_600) / 60)],
    ["s", total % 60],
  ];
  const first = units.findIndex(([, amount]) => amount > 0);
  return units
    .slice(first, first + 2)
    .filter(([, amount]) => amount > 0)
    .map(([unit, amount]) => `${amount}${unit}`)
    .join(" ");
}

/** An x-axis label for a time bucket: the hour for a one-day range, the date otherwise. */
export function formatBucket(value: string, granularity: "hour" | "day"): string {
  const date = dayjs(value);
  if (!date.isValid()) return value;
  return granularity === "hour" ? date.format("h A") : date.format("D MMM");
}

/** The single-day presets are bucketed by hour on the server, everything else by day. */
export function granularityFor(dateKey: string): "hour" | "day" {
  return dateKey === "today" || dateKey === "yesterday" ? "hour" : "day";
}

/**
 * The change from `previous` to `current`, in percent. Null when there is no earlier
 * figure to compare with: "+100%" against nothing would claim a trend that isn't there.
 */
export function percentChange(current: Numeric, previous: Numeric): number | null {
  const now = toNumber(current);
  const before = toNumber(previous);
  if (now === null || before === null || before === 0) return null;
  return ((now - before) / before) * 100;
}

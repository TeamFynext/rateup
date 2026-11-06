import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const integer = new Intl.NumberFormat("en-IN");
const compactNumber = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const compactRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatNumber = (value: number) => integer.format(value);
export const formatCompact = (value: number) => compactNumber.format(value);
export const formatRupees = (value: number) => rupees.format(value);
/** ₹18.4L, ₹1.2Cr: Indian grouping, which is how the business reads revenue. */
export const formatRupeesCompact = (value: number) => compactRupees.format(value);

type DateInput = string | Date | null | undefined;

/** "22 Sep 2026", or an em dash for nothing. */
export function formatDate(value: DateInput): string {
  return value ? dayjs(value).format("D MMM YYYY") : "—";
}

export function formatDateTime(value: DateInput): string {
  return value ? dayjs(value).format("D MMM YYYY, HH:mm") : "—";
}

/** "3 days ago", "in 5 days". */
export function formatRelative(value: DateInput): string {
  return value ? dayjs(value).fromNow() : "—";
}

/** Whole days from now until `value`; negative once it has passed. */
export function daysUntil(value: DateInput): number | null {
  if (!value) return null;
  return Math.ceil(dayjs(value).diff(dayjs(), "hour") / 24);
}

/** A date a century out is how the free tier spells "never expires". */
export function isEffectivelyNever(value: DateInput): boolean {
  return Boolean(value && dayjs(value).diff(dayjs(), "year") >= 50);
}

/** Month label for a `YYYY-MM-01` series point: "Sep", or "Sep 25" across a year boundary. */
export function monthLabel(month: string, withYear = false): string {
  return dayjs(month).format(withYear ? "MMM YY" : "MMM");
}

/** Signed percentage change, or null when there is no base to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function pluralize(count: number, one: string, many = `${one}s`): string {
  return `${formatNumber(count)} ${count === 1 ? one : many}`;
}

/** An amount in a gateway currency ("INR", "usd"), in major units. */
export function formatMoney(
  amount: number | null | undefined,
  currency: string | null | undefined,
) {
  if (amount === null || amount === undefined) return "—";
  const code = (currency || "INR").toUpperCase();
  try {
    return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${formatNumber(amount)} ${code}`;
  }
}

/** "INACTIVE" → "Inactive", "one_time" → "One time". */
export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  const text = value.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

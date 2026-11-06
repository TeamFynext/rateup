import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);
dayjs.extend(isBetween);
dayjs.extend(relativeTime);

/** Anything dayjs()/new Date() accepts as an input. */
type DateInput = string | number | Date | dayjs.Dayjs | null | undefined;

/** A menu category / item carrying an optional daily availability window. */
type ScheduledCategory = {
  startTime?: DateInput;
  endTime?: DateInput;
  scheduleEnabled?: boolean;
};

export const formatedTime = (category: ScheduledCategory) => {
  const currentTime = dayjs().format("HH:mm");
  const formattedStartTime = dayjs(category?.startTime).format("HH:mm");
  const formattedStartTimeWithAmPm = dayjs(category?.startTime).format("hh:mm A");
  const formattedEndTime = dayjs(category?.endTime).format("HH:mm");
  const formattedEndTimeWithAmPm = dayjs(category?.endTime).format("hh:mm A");
  let withinTimeRange;
  if (formattedStartTime > formattedEndTime) {
    withinTimeRange = formattedStartTime <= currentTime || formattedEndTime >= currentTime;
  } else {
    withinTimeRange = formattedStartTime <= currentTime && formattedEndTime >= currentTime;
  }
  const categoryDisabled = category?.scheduleEnabled && !withinTimeRange;
  return {
    formattedEndTimeWithAmPm,
    formattedStartTimeWithAmPm,
    categoryDisabled,
  };
};

export const formatToCustomTime = (timestamp: DateInput) => {
  if (!timestamp) return "-- : --";
  return dayjs(timestamp).format("hh:mm a");
};

export const createCustomTimestamp = (customTime: string) => {
  const [hours, minutes] = customTime.split(":").map(Number);
  return dayjs().set("hour", hours).set("minute", minutes).toDate();
};

// Like... Output: '14th Feb, 2024'
export function formatIsoDateString(isoDateString: DateInput) {
  return dayjs(isoDateString).format("Do MMM, YYYY");
}

// Like... Output: '13th Mar, 2024, 12:00 AM'
export function formatIsoDateStringWithTime(isoDateString: DateInput) {
  if (!isoDateString) return null;
  return dayjs(isoDateString).format("Do MMM, YYYY, h:mm A");
}
export function formatToRelativeTime(date: DateInput, isUtc = false) {
  if (isUtc) return dayjs.utc(date).fromNow();
  return dayjs(date).fromNow();
}
/** How long an inbox row stays "fresh" (highlighted) after its newest message. */
export const INBOX_FRESH_ROW_MS = 24 * 60 * 60 * 1000;

/**
 * True when `iso` is within the last {@link INBOX_FRESH_ROW_MS}.
 *
 * The API hands back UTC timestamps, but not always with a zone suffix, and a
 * bare one parses as local time — so a missing zone is read as UTC, the same
 * assumption `formatToRelativeTime(…, true)` makes. A future timestamp is clock
 * skew, not an old message, so it counts as fresh. Mirrors the app's
 * `isWithinLastDay`.
 */
export function isWithinLastDay(iso: string | null | undefined, now = Date.now()): boolean {
  if (!iso) return false;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso);
  const ms = Date.parse(hasZone ? iso : `${iso}Z`);
  if (Number.isNaN(ms)) return false;
  return now - ms <= INBOX_FRESH_ROW_MS;
}

const currentTime = dayjs().format("HH:mm");
export const isCategoryActive = (item: ScheduledCategory) => {
  if (!item.startTime || !item.endTime || !item.scheduleEnabled) {
    return true;
  }
  const startTime = dayjs(item.startTime).format("HH:mm");
  const endTime = dayjs(item.endTime).format("HH:mm");
  if (startTime > endTime) return currentTime >= startTime || currentTime <= endTime;
  else return startTime <= currentTime && endTime >= currentTime;
};

export const formatDate = (date: DateInput) => dayjs(date).format("DD/MM/YYYY");

export function isToday(isoDateString: DateInput) {
  return dayjs(isoDateString).isAfter(dayjs().startOf("day"));
}

export function isYesterday(isoDateString: DateInput) {
  return dayjs(isoDateString).isBetween(
    dayjs().subtract(1, "day").startOf("day"),
    dayjs().subtract(1, "day").endOf("day"),
    null,
    "[]",
  );
}

export function isThisMonth(isoDateString: DateInput) {
  return dayjs(isoDateString).isAfter(dayjs().startOf("month"));
}

export function isInLastSevenDays(isoDateString: DateInput) {
  return dayjs().diff(dayjs(isoDateString), "week") == 0;
}

export function roundOffMinutesAndSeconds(dateString: string | number | Date) {
  const date = new Date(dateString);
  const roundOffTime = (time: number) => Math.floor(time / 60) * 60;

  const roundedMinutes = roundOffTime(date.getMinutes() + 30);
  const roundedSeconds = roundOffTime(date.getSeconds() + 30);

  date.setMinutes(roundedMinutes);
  date.setSeconds(roundedSeconds);

  return date;
}

export function formatDateWithRelativeTime(date: DateInput) {
  const d = dayjs(date);
  if (isToday(date)) {
    return `Today ${d.format("hh:mm A")}`;
  } else if (isYesterday(date)) {
    return `Yesterday ${d.format("hh:mm A")}`;
  } else {
    return d.format("DD/MM/YY hh:mm A");
  }
}

/**
 * Callers pass either a number or the numeric string the analytics endpoints
 * return; the comparisons and arithmetic below coerce either the same way.
 */
export function formatTimeToNearestUnitFromSeconds(seconds?: number | string) {
  if (seconds === 0) return { value: 0, suffix: "minute" };
  if (!seconds) return;
  // Matches the implicit coercion the comparisons and arithmetic already did.
  const total = Number(seconds);
  let value = total;
  let suffix = "second (s)";
  if (total < 3600) {
    value = Math.round(total / 60);
    suffix = "minute(s)";
  } else if (total < 86400) {
    value = Math.round(total / 3600);
    suffix = "hour(s)";
  } else {
    value = Math.round(total / 86400);
    suffix = "day(s)";
  }
  return { value, suffix };
}

/**
 * `YYYY-MM-DD` in the viewer's own timezone. `toISOString()` would shift the day for anyone
 * east or west of UTC at the wrong hour, which is how a "tomorrow" pick becomes today.
 */
export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

/**
 * The inverse, parsed as a local date for the same reason. Returns undefined for a blank or
 * unparseable key, so a picker bound to an empty field shows its placeholder instead of
 * "Invalid Date".
 */
export const fromDateKey = (key: string | null | undefined): Date | undefined => {
  if (!key) return undefined;
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

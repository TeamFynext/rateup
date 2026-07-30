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

export function formatTimeToNearestUnitFromSeconds(seconds: number) {
  if (seconds === 0) return { value: 0, suffix: "minute" };
  if (!seconds) return;
  let value = seconds;
  let suffix = "second (s)";
  if (seconds < 3600) {
    value = Math.round(seconds / 60);
    suffix = "minute(s)";
  } else if (seconds < 86400) {
    value = Math.round(seconds / 3600);
    suffix = "hour(s)";
  } else {
    value = Math.round(seconds / 86400);
    suffix = "day(s)";
  }
  return { value, suffix };
}

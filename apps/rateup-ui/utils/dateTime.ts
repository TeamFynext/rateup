import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);
dayjs.extend(isBetween);
dayjs.extend(relativeTime);

export function findPreviousMonday(date: Date): Date {
  const day = date.getDay();
  const difference = day === 0 ? 6 : day - 1; // if Sunday, go back 6 days to last Monday, else go back to last Monday
  const previousMonday = new Date(date);
  previousMonday.setDate(date.getDate() - difference);
  return previousMonday;
}

export const formatedTime = (category) => {
  const currentTime = dayjs().format("HH:mm");
  const formattedStartTime = dayjs(category?.startTime).format("HH:mm");
  const formattedStartTimeWithAmPm = dayjs(category?.startTime).format(
    "hh:mm A",
  );
  const formattedEndTime = dayjs(category?.endTime).format("HH:mm");
  const formattedEndTimeWithAmPm = dayjs(category?.endTime).format("hh:mm A");
  let withinTimeRange;
  formattedStartTime <= currentTime && formattedEndTime >= currentTime;
  if (formattedStartTime > formattedEndTime) {
    withinTimeRange =
      formattedStartTime <= currentTime || formattedEndTime >= currentTime;
  } else {
    withinTimeRange =
      formattedStartTime <= currentTime && formattedEndTime >= currentTime;
  }
  let categoryDisabled = category?.scheduleEnabled && !withinTimeRange;
  return {
    formattedEndTimeWithAmPm,
    formattedStartTimeWithAmPm,
    categoryDisabled,
  };
};

export const formatToCustomTime = (timestamp) => {
  if (!timestamp) return "-- : --";
  return dayjs(timestamp).format("hh:mm a");
};

export const formatUnixTimeStamp = (timestamp: number) => {
  return dayjs.unix(timestamp).format("HH:mm");
};

export const createCustomTimestamp = (customTime) => {
  const [hours, minutes] = customTime.split(":").map(Number);
  return dayjs().set("hour", hours).set("minute", minutes).toDate();
};

//Like... Output: '14th Feb, 2024'
export function formatIsoDateString(isoDateString) {
  return dayjs(isoDateString).format("Do MMM, YYYY");
}

//Like... Output: '13th Mar, 2024, 12:00 AM'
export function formatIsoDateStringWithTime(isoDateString) {
  if (!isoDateString) return null;
  return dayjs(isoDateString).format("Do MMM, YYYY, h:mm A");
}
export function formatToRelativeTime(date) {
  return dayjs(date).fromNow();
}
const currentTime = dayjs().format("HH:mm");
export const isCategoryActive = (item) => {
  if (!item.startTime || !item.endTime || !item.scheduleEnabled) {
    return true;
  }
  const startTime = dayjs(item.startTime).format("HH:mm");
  const endTime = dayjs(item.endTime).format("HH:mm");
  if (startTime > endTime)
    return currentTime >= startTime || currentTime <= endTime;
  else return startTime <= currentTime && endTime >= currentTime;
};

export const formatDate = (date) => dayjs(date).format("DD/MM/YYYY");

export function isToday(isoDateString) {
  return dayjs(isoDateString).isAfter(dayjs().startOf("day"));
}

export function isYesterday(isoDateString) {
  return dayjs(isoDateString).isBetween(
    dayjs().subtract(1, "day").startOf("day"),
    dayjs().subtract(1, "day").endOf("day"),
    null,
    "[]",
  );
}

export function isThisMonth(isoDateString) {
  return dayjs(isoDateString).isAfter(dayjs().startOf("month"));
}

export function isInLastSevenDays(isoDateString) {
  return dayjs().diff(dayjs(isoDateString), "week") == 0;
}

export function roundOffMinutesAndSeconds(dateString) {
  const date = new Date(dateString);
  const roundOffTime = (time) => Math.floor(time / 60) * 60;

  let roundedMinutes = roundOffTime(date.getMinutes() + 30);
  let roundedSeconds = roundOffTime(date.getSeconds() + 30);

  date.setMinutes(roundedMinutes);
  date.setSeconds(roundedSeconds);

  return date;
}

// 11-12-2024 11:20 PM
export function formatDateWithTime(date: string | Date) {
  return dayjs(date).format("DD-MM-YYYY hh:mm A");
}

// Jan 2024
export function formateDate2(date) {
  return dayjs(date).format("MMM, YYYY");
}
export function getTimeRemaining(targetDate) {
  const now = dayjs().startOf("day");
  const target = dayjs(targetDate).endOf("day");

  if (now.isAfter(target)) {
    return "overdue by " + now.diff(target, "day") + " days";
  }

  const diffInDays = target.diff(now, "day");
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = target.diff(now, "month");
  const diffInYears = target.diff(now, "year");

  if (diffInYears >= 1) {
    return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} left`;
  } else if (diffInMonths >= 1) {
    return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} left`;
  } else if (diffInWeeks >= 1) {
    return `${diffInWeeks} ${diffInWeeks === 1 ? "week" : "weeks"} left`;
  } else {
    return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} left`;
  }
}

export function formatDateWithRelativeTime(date) {
  const d = dayjs(date);
  if (isToday(date)) {
    return `Today ${d.format("hh:mm A")}`;
  } else if (isYesterday(date)) {
    return `Yesterday ${d.format("hh:mm A")}`;
  } else {
    return d.format("DD/MM/YY hh:mm A");
  }
}

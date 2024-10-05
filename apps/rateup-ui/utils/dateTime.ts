import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);
dayjs.extend(isBetween);

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
  return dayjs(isoDateString).format("Do MMM, YYYY, h:mm A");
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

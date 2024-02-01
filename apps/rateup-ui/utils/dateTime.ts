import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import advancedFormat from "dayjs/plugin/advancedFormat";
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
  const withinTimeRange =
    formattedStartTime <= currentTime && formattedEndTime >= currentTime;
  let categoryDisabled = category?.scheduleEnabled && !withinTimeRange;
  return {
    formattedEndTimeWithAmPm,
    formattedStartTimeWithAmPm,
    categoryDisabled,
  };
};

export const formatToCustomTime = (timestamp) => {
  return dayjs(timestamp).format("HH:mm");
};

export const createCustomTimestamp = (customTime) => {
  const [hours, minutes] = customTime.split(":").map(Number);
  return dayjs().set("hour", hours).set("minute", minutes).toDate();
};

//Like... Output: '14th Feb, 2024'
export function formatIsoDateString(isoDateString) {
  return dayjs(isoDateString).format("Do MMM, YYYY");
}

const currentTime = dayjs().format("HH:mm");
export const isCategoryActive = (item) => {
  if (!item.startTime || !item.endTime || !item.scheduleEnabled) {
    return true;
  }
  const startTime = dayjs(item.startTime).format("HH:mm");
  const endTime = dayjs(item.endTime).format("HH:mm");
  return startTime <= currentTime && endTime >= currentTime;
};

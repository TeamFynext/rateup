import dayjs from "dayjs";

export const formatDateT1 = (date: string | number | Date) => {
  const dateString = new Date(date);

  return dateString.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}; // Output:  February 27, 2024

export const formatDateT2 = (dateString: string | number | Date) => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  };
  return date.toLocaleString("en-US", options);
}; // March 31, 2024 at 12:00 AM.

export const getScheduleTime = (minutes: number, fromDate: Date) =>
  dayjs(fromDate).add(minutes, "minutes").toDate();

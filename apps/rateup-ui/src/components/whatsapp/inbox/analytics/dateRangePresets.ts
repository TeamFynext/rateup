import dayjs from "dayjs";

/**
 * The range a preset stands for, as whole local days.
 *
 * The ends used to be "now" and "now minus N days", to the millisecond. That made
 * every click a range nobody had asked for before, so neither react-query nor the
 * server's cache could ever answer it from memory. Whole days are the same all day:
 * re-picking a preset, switching tabs, or a colleague opening the page all land on
 * one cache entry. "Last 7 days" is today and the six days before it.
 */
export function presetRange(key: string, now: dayjs.Dayjs = dayjs()): Date[] {
  const daysBack = (days: number) => [
    now.subtract(days, "day").startOf("day").toDate(),
    now.endOf("day").toDate(),
  ];
  switch (key) {
    case "today":
      return daysBack(0);
    case "yesterday":
      return [
        now.subtract(1, "day").startOf("day").toDate(),
        now.subtract(1, "day").endOf("day").toDate(),
      ];
    case "last7days":
      return daysBack(6);
    case "last30days":
      return daysBack(29);
    case "custom-range":
      return daysBack(59);
    default:
      return [];
  }
}

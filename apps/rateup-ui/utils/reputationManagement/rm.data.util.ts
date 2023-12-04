import dayjs from "dayjs";
import weekofyear from "dayjs/plugin/weekOfYear";
dayjs.extend(weekofyear);

export enum TIME_INTERVALS {
  Yearly = "Yearly",
  Monthly = "Monthly",
  Weekly = "Weekly",
  Daily = "Daily",
}

export function groupDataByTimeIntervals(
  timeInterval: TIME_INTERVALS,
  dataOverTime: { [date: string]: number[] },
  firstDate: string,
  lastDate: string,
) {
  const graphDataByTimeIntervals = {};

  if (timeInterval === TIME_INTERVALS.Yearly) {
    for (let date in dataOverTime) {
      const year = dayjs(date).year();
      if (year in graphDataByTimeIntervals) {
        graphDataByTimeIntervals[year].push(...dataOverTime[date]);
      } else {
        graphDataByTimeIntervals[year] = [...dataOverTime[date]];
      }
    }
  } else if (timeInterval === TIME_INTERVALS.Monthly) {
    let date = dayjs(firstDate);
    while (date.isBefore(lastDate)) {
      const month = date.format("MM/YY");
      graphDataByTimeIntervals[month] = [];
      date = date.add(1, "month");
    }
    for (const date in dataOverTime) {
      const month = dayjs(date).format("MM/YY");
      if (month in graphDataByTimeIntervals) {
        graphDataByTimeIntervals[month].push(...dataOverTime[date]);
      } else {
        graphDataByTimeIntervals[month] = [...dataOverTime[date]];
      }
    }
  } else if (timeInterval === TIME_INTERVALS.Weekly) {
    let date = dayjs(firstDate);
    while (date.isBefore(lastDate)) {
      const week = `w${dayjs(date).week()}/${dayjs(date).format("YY")}`;
      graphDataByTimeIntervals[week] = [];
      date = date.add(1, "week");
    }
    for (let date in dataOverTime) {
      const week = `w${dayjs(date).week()}/${dayjs(date).format("YY")}`;
      if (week in graphDataByTimeIntervals) {
        graphDataByTimeIntervals[week].push(...dataOverTime[date]);
      } else {
        graphDataByTimeIntervals[week] = [...dataOverTime[date]];
      }
    }
  } else if (timeInterval === TIME_INTERVALS.Daily) {
    let date = dayjs(firstDate);
    while (date.isBefore(lastDate)) {
      const day = date.format("DD/MM/YY");
      graphDataByTimeIntervals[day] = [];
      date = date.add(1, "day");
    }
    for (let date in dataOverTime) {
      const day = dayjs(date).format("DD/MM/YY");
      if (day in graphDataByTimeIntervals) {
        graphDataByTimeIntervals[day].push(...dataOverTime[date]);
      } else {
        graphDataByTimeIntervals[day] = [...dataOverTime[date]];
      }
    }
  }
  return graphDataByTimeIntervals;
}

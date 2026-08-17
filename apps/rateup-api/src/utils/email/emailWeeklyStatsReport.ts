import type { WeeklyStatsRow } from "../../emails/weekly-stats.js";
import { renderWeeklyStatsEmail } from "./react/templates.js";

/** The seven days ending today — the window the report covers. */
function reportPeriod() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return { periodStart: start.toDateString(), periodEnd: end.toDateString() };
}

export function createMessageTemplate({ rows }: { rows: WeeklyStatsRow[] }) {
  return renderWeeklyStatsEmail({ ...reportPeriod(), rows });
}

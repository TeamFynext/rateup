import type { AnalyticsFilters } from "../kit/filters.ts";
import { MessageLogs } from "../logs/MessageLogs.tsx";

/** The message log. The audit log that used to sit beside it is in Settings now. */
export function LogsView({ filters }: Readonly<{ filters: AnalyticsFilters }>) {
  return <MessageLogs filters={filters} />;
}

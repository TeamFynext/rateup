import type { AnalyticsDateRange, QueryFilter } from "@/types/api.ts";

/** The filters the bar at the top of the section sets, shared by every view. */
export interface AnalyticsFilters {
  dateRange: AnalyticsDateRange;
  teamId: string;
  /** Which outbound messages count: "all", "external" (API) or "whatsapp" (campaign & inbox). */
  apiType: string;
}

/** What the conversation endpoints read. */
export function conversationFilter(filters: AnalyticsFilters): QueryFilter {
  return {
    dateKey: filters.dateRange.key,
    dateRange: filters.dateRange.range,
    teamId: filters.teamId,
  };
}

/** What the delivery endpoints read: the conversation filter plus the channel type. */
export function deliveryFilter(filters: AnalyticsFilters): QueryFilter {
  return { ...conversationFilter(filters), apiType: filters.apiType };
}

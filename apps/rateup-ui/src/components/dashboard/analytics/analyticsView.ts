/** The four views of `/dashboard/analytics`, and the sub-views two of them switch between. */
export const ANALYTICS_TABS = ["overview", "conversations", "messages", "logs"] as const;
export type AnalyticsTab = (typeof ANALYTICS_TABS)[number];
export type ConversationsView = "agents" | "teams";
export type LogsView = "messages" | "activity";

export interface AnalyticsSearch {
  tab?: AnalyticsTab;
  view?: ConversationsView;
  log?: LogsView;
}

/** The six tabs the section had before, and where each one lives now. */
const LEGACY_TABS: Record<string, Required<Pick<AnalyticsSearch, "tab">> & AnalyticsSearch> = {
  "agent-performance": { tab: "conversations", view: "agents" },
  "team-performance": { tab: "conversations", view: "teams" },
  "api-analytics": { tab: "messages" },
  "message-logs": { tab: "logs", log: "messages" },
  "team-activity": { tab: "logs", log: "activity" },
};

export function isLegacyAnalyticsTab(tab: unknown): boolean {
  return typeof tab === "string" && tab in LEGACY_TABS;
}

function isTab(value: unknown): value is AnalyticsTab {
  return typeof value === "string" && (ANALYTICS_TABS as readonly string[]).includes(value);
}

/** Reads the route's search, mapping an old tab name onto its new view. Unknown values are dropped. */
export function parseAnalyticsSearch(search: Record<string, unknown>): AnalyticsSearch {
  if (typeof search.tab === "string" && search.tab in LEGACY_TABS) {
    return { ...LEGACY_TABS[search.tab] };
  }
  const parsed: AnalyticsSearch = {};
  if (isTab(search.tab)) parsed.tab = search.tab;
  if (search.view === "agents" || search.view === "teams") parsed.view = search.view;
  if (search.log === "messages" || search.log === "activity") parsed.log = search.log;
  return parsed;
}

/** The five views of `/dashboard/analytics`, and the sub-views Team Performance switches between. */
export const ANALYTICS_TABS = [
  "overview",
  "team-performance",
  "template-delivery",
  "message-log",
  "instagram",
] as const;
export type AnalyticsTab = (typeof ANALYTICS_TABS)[number];
export type ConversationsView = "agents" | "teams";

export interface AnalyticsSearch {
  tab?: AnalyticsTab;
  view?: ConversationsView;
}

/**
 * Tab names the section used before, and where each one lives now. A sub-view given
 * here is forced; otherwise the link's own `view` is kept.
 *
 * `team-performance` is both an old name (it meant the Teams sub-view) and the current
 * one, so it is not listed: an old bookmark to it lands on the view's default sub-view.
 */
const LEGACY_TABS: Record<string, Required<Pick<AnalyticsSearch, "tab">> & AnalyticsSearch> = {
  // The three tabs renamed with their labels.
  conversations: { tab: "team-performance" },
  messages: { tab: "template-delivery" },
  logs: { tab: "message-log" },
  // The six tabs from before the views were merged.
  "agent-performance": { tab: "team-performance", view: "agents" },
  "api-analytics": { tab: "template-delivery" },
  "message-logs": { tab: "message-log" },
};

/**
 * Links to the audit log from when it was a tab of Logs (`?tab=logs&log=activity`, and the
 * older `?tab=team-activity`). It lives in Settings now.
 */
export function isAuditLogLink(search: Record<string, unknown>): boolean {
  return search.tab === "team-activity" || (search.tab === "logs" && search.log === "activity");
}

export function isLegacyAnalyticsTab(tab: unknown): boolean {
  return typeof tab === "string" && Object.hasOwn(LEGACY_TABS, tab);
}

function isTab(value: unknown): value is AnalyticsTab {
  return typeof value === "string" && (ANALYTICS_TABS as readonly string[]).includes(value);
}

/** Reads the route's search, mapping an old tab name onto its new view. Unknown values are dropped. */
export function parseAnalyticsSearch(search: Record<string, unknown>): AnalyticsSearch {
  // Left untouched so the route's beforeLoad still sees the old tab and sends it to Settings:
  // the search it reads is rebuilt from this result, so mapping `logs` here would hide it.
  if (isAuditLogLink(search)) return {};
  const parsed: AnalyticsSearch = {};
  if (search.view === "agents" || search.view === "teams") parsed.view = search.view;
  if (isLegacyAnalyticsTab(search.tab)) {
    return { ...parsed, ...LEGACY_TABS[search.tab as string] };
  }
  if (isTab(search.tab)) parsed.tab = search.tab;
  return parsed;
}

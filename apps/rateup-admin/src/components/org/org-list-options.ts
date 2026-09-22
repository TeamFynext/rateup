import type { OrgListParams } from "@/api/orgs.api";
import type { FilterChip } from "@/components/ds/filter-chips";

/** The saved filters above the organisations list, each one a set of API parameters. */
export const ORG_VIEWS = {
  all: { label: "All", params: {} },
  paid: { label: "Paid", params: { status: "paid" } },
  expiring: {
    label: "Expiring in 14 days",
    params: { expiringInDays: 14, sort: "expires", order: "asc" },
  },
  expired: { label: "Expired", params: { status: "expired" } },
  new: { label: "New this week", params: { createdWithinDays: 7 } },
  paused: { label: "Paused by customer", params: { status: "paused" } },
  no_plan: { label: "No plan", params: { status: "no_plan" } },
} as const satisfies Record<string, { label: string; params: OrgListParams }>;

export type OrgView = keyof typeof ORG_VIEWS;
export const ORG_VIEW_KEYS = Object.keys(ORG_VIEWS) as [OrgView, ...OrgView[]];

export const ORG_VIEW_CHIPS: FilterChip<OrgView>[] = ORG_VIEW_KEYS.map((key) => ({
  value: key,
  label: ORG_VIEWS[key].label,
}));

/** The sort menu; each entry is one API sort + direction. */
export const ORG_SORT_OPTIONS = {
  newest: { label: "Newest first", sort: "created", order: "desc" },
  oldest: { label: "Oldest first", sort: "created", order: "asc" },
  name: { label: "Name A–Z", sort: "name", order: "asc" },
  expiring: { label: "Expiring first", sort: "expires", order: "asc" },
  usage: { label: "Most conversations", sort: "conversations", order: "desc" },
} as const satisfies Record<
  string,
  { label: string; sort: OrgListParams["sort"]; order: "asc" | "desc" }
>;

export type OrgSortKey = keyof typeof ORG_SORT_OPTIONS;
export const ORG_SORT_KEYS = Object.keys(ORG_SORT_OPTIONS) as [OrgSortKey, ...OrgSortKey[]];

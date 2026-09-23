import { z } from "zod";

import type { OrgListParams } from "@/api/orgs.api";

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
  suspended: { label: "Suspended by us", params: { status: "suspended" } },
  paused: { label: "Paused by customer", params: { status: "paused" } },
  no_plan: { label: "No plan", params: { status: "no_plan" } },
} as const satisfies Record<string, { label: string; params: OrgListParams }>;

export type OrgView = keyof typeof ORG_VIEWS;
export const ORG_VIEW_KEYS = Object.keys(ORG_VIEWS) as [OrgView, ...OrgView[]];

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

/**
 * The directory's filters, validated on `/orgs`: the parent of the list and every org page,
 * so they survive clicking from one organisation to the next.
 */
export const orgDirectorySearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  view: z.enum(ORG_VIEW_KEYS).optional().catch(undefined),
  plan: z.string().optional().catch(undefined),
  sort: z.enum(ORG_SORT_KEYS).optional().catch(undefined),
});
export type OrgDirectorySearch = z.infer<typeof orgDirectorySearchSchema>;

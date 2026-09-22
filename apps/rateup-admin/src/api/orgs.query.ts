import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import {
  getOrg,
  getOrgActivity,
  getOrgInvoices,
  getOrgMessageStats,
  getOrgOrders,
  getOrgChannels,
  getOrgMembers,
  getOrgUsage,
  listOrgs,
  listPlanOptions,
  type ActivitySource,
  type OrgListParams,
} from "./orgs.api";

export const orgListQueryOptions = (params: OrgListParams) =>
  queryOptions({
    queryKey: ["staff", "orgs", "list", params],
    queryFn: ({ signal }) => listOrgs(params, signal),
    // The table keeps its rows while the next page or filter loads, instead of flashing empty.
    placeholderData: keepPreviousData,
  });

export const planOptionsQueryOptions = queryOptions({
  queryKey: ["staff", "orgs", "plans"],
  queryFn: listPlanOptions,
  staleTime: 10 * 60_000,
});

export const orgQueryOptions = (orgId: string) =>
  queryOptions({ queryKey: ["staff", "orgs", orgId], queryFn: () => getOrg(orgId) });

export const orgMembersQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: ["staff", "orgs", orgId, "members"],
    queryFn: () => getOrgMembers(orgId),
  });

export const orgUsageQueryOptions = (orgId: string) =>
  queryOptions({ queryKey: ["staff", "orgs", orgId, "usage"], queryFn: () => getOrgUsage(orgId) });

export const orgChannelsQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: ["staff", "orgs", orgId, "channels"],
    queryFn: () => getOrgChannels(orgId),
  });

export const orgOrdersQueryOptions = (orgId: string, page: number) =>
  queryOptions({
    queryKey: ["staff", "orgs", orgId, "orders", page],
    queryFn: () => getOrgOrders(orgId, page),
    placeholderData: keepPreviousData,
  });

/** Live from Razorpay, one call per subscription, so it is not refetched on every visit. */
export const orgInvoicesQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: ["staff", "orgs", orgId, "invoices"],
    queryFn: () => getOrgInvoices(orgId),
    staleTime: 5 * 60_000,
    retry: false,
  });

export const orgMessageStatsQueryOptions = (orgId: string, range: { from: string; to: string }) =>
  queryOptions({
    queryKey: ["staff", "orgs", orgId, "message-stats", range],
    queryFn: () => getOrgMessageStats(orgId, range),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

export const orgActivityQueryOptions = (orgId: string, source: ActivitySource, page: number) =>
  queryOptions({
    queryKey: ["staff", "orgs", orgId, "activity", source, page],
    queryFn: () => getOrgActivity(orgId, source, page),
    placeholderData: keepPreviousData,
  });

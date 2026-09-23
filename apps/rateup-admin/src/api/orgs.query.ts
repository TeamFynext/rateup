import { infiniteQueryOptions, keepPreviousData, queryOptions } from "@tanstack/react-query";

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
  type UsageDays,
} from "./orgs.api";

/** The sidebar directory: the same list, loaded a page at a time as it scrolls. */
export const orgDirectoryQueryOptions = (params: Omit<OrgListParams, "page">) =>
  infiniteQueryOptions({
    queryKey: ["staff", "orgs", "directory", params],
    queryFn: ({ pageParam, signal }) => listOrgs({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
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

export const orgUsageQueryOptions = (orgId: string, days: UsageDays = 30) =>
  queryOptions({
    queryKey: ["staff", "orgs", orgId, "usage", days],
    queryFn: () => getOrgUsage(orgId, days),
    placeholderData: keepPreviousData,
  });

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

import { useQuery } from "@tanstack/react-query";

import { analyticsQueryOptions } from "@/backend/analytics/analyticsFilter";
import { getApiErrorData, isNotFound } from "@/utils/apiError";

import {
  getInstagramAccountInsights,
  getInstagramPostsInsights,
  INSIGHTS_PERMISSION_CODE,
  type InstagramInsightsRange,
} from "./instagramInsights.api";

/** `instagramInsights` is listed in `analyticsKeys.roots()`, so the Refresh button covers it. */
export const instagramInsightsKeys = {
  account: (ibaId: string, range: InstagramInsightsRange) =>
    ["instagramInsights", ibaId, "account", range] as const,
  posts: (ibaId: string, range: InstagramInsightsRange) =>
    ["instagramInsights", ibaId, "posts", range] as const,
};

/** The Instagram token is missing the insights permission: a reconnect fixes it, a retry won't. */
export function isInsightsPermissionError(error: unknown): boolean {
  return getApiErrorData(error)?.code === INSIGHTS_PERMISSION_CODE;
}

const retry = (failureCount: number, error: unknown) =>
  !isInsightsPermissionError(error) && !isNotFound(error) && failureCount < 1;

export const useInstagramAccountInsights = (
  ibaId: string | undefined,
  range: InstagramInsightsRange,
) =>
  useQuery({
    queryKey: instagramInsightsKeys.account(ibaId ?? "", range),
    queryFn: () => getInstagramAccountInsights(ibaId ?? "", range),
    enabled: Boolean(ibaId),
    retry,
    ...analyticsQueryOptions,
  });

export const useInstagramPostsInsights = (
  ibaId: string | undefined,
  range: InstagramInsightsRange,
) =>
  useQuery({
    queryKey: instagramInsightsKeys.posts(ibaId ?? "", range),
    queryFn: () => getInstagramPostsInsights(ibaId ?? "", range),
    enabled: Boolean(ibaId),
    retry,
    ...analyticsQueryOptions,
  });

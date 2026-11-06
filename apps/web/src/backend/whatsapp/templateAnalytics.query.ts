import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  enableTemplateInsights,
  getTemplateAnalytics,
  getTemplateInsightsStatus,
  type TemplateAnalyticsParams,
} from "./templateAnalytics.api";

export const templateAnalyticsKeys = {
  all: () => ["waTemplateAnalytics"] as const,
  data: (params: TemplateAnalyticsParams) => ["waTemplateAnalytics", "data", params] as const,
  status: (phoneId: string) => ["waTemplateAnalytics", "status", phoneId] as const,
};

/** The server caches Meta's answer for 10 minutes; there is no point asking sooner. */
const STALE_MS = 5 * 60 * 1000;

export function useTemplateAnalytics(params: TemplateAnalyticsParams | null) {
  return useQuery({
    queryKey: templateAnalyticsKeys.data(params ?? { phoneId: "", templateIds: [], days: 0 }),
    // `enabled` keeps this from running without params.
    queryFn: () =>
      params ? getTemplateAnalytics(params) : Promise.reject(new Error("No templates")),
    enabled: !!params && !!params.phoneId && params.templateIds.length > 0,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useTemplateInsightsStatus(phoneId: string | null | undefined) {
  return useQuery({
    queryKey: templateAnalyticsKeys.status(phoneId ?? ""),
    queryFn: () =>
      phoneId ? getTemplateInsightsStatus(phoneId) : Promise.reject(new Error("No number")),
    enabled: !!phoneId,
    staleTime: STALE_MS,
  });
}

export function useEnableTemplateInsights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: enableTemplateInsights,
    onSuccess: () => qc.invalidateQueries({ queryKey: templateAnalyticsKeys.all() }),
  });
}

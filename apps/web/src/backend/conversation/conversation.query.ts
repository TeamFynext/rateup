import { useQuery } from "@tanstack/react-query";

import { analyticsQueryOptions, toAnalyticsParams } from "@/backend/analytics/analyticsFilter";
import { teamKeys, staffKeys } from "@/backend/org/org.keys";
import type { QueryFilter } from "@/types/api.ts";

import {
  getAverageConversationResponseTimeGraphData,
  getConversationAccountDistribution,
  getConversationOverView,
  getConversationQuickStats,
  getResolvedConversationStats,
  getStaffDetailedConversationAnalytics,
  getStaffPerformanceonConversation,
  getTeamDetailedMetrics,
  getTeamOverview,
} from "./conversation.api";

export const useGetConversationOverView = (filter: QueryFilter) => {
  return useQuery({
    queryFn: () => getConversationOverView(filter),
    queryKey: ["conversationOverview", toAnalyticsParams(filter)],
    ...analyticsQueryOptions,
  });
};

export const useGetAverageConversationResponseTimeGraphData = (
  filter: QueryFilter | null = null,
) => {
  return useQuery({
    queryFn: () => getAverageConversationResponseTimeGraphData(filter),
    queryKey: ["conversationAverageResponseTime", toAnalyticsParams(filter)],
    ...analyticsQueryOptions,
  });
};

export const useGetResolvedConversationStats = (filter: QueryFilter) => {
  return useQuery({
    queryFn: () => getResolvedConversationStats(filter),
    queryKey: ["conversationResolvedStats", toAnalyticsParams(filter)],
    ...analyticsQueryOptions,
  });
};

export const useGetConversationAccountDistribution = (filter: QueryFilter | null = null) => {
  return useQuery({
    queryFn: () => getConversationAccountDistribution(filter ?? {}),
    queryKey: ["ConversationAccountDistribution", toAnalyticsParams(filter)],
    ...analyticsQueryOptions,
  });
};

export const useGetConversationQuickStats = (filter: QueryFilter | null = null) => {
  return useQuery({
    queryFn: () => getConversationQuickStats(filter),
    queryKey: ["ConversationQuickStats", toAnalyticsParams(filter)],
    ...analyticsQueryOptions,
  });
};
export const useGetStaffPerformanceonConversation = (filter: QueryFilter | null = null) => {
  return useQuery({
    queryFn: () => getStaffPerformanceonConversation(filter),
    queryKey: staffKeys.conversationPerformance(toAnalyticsParams(filter)),
    ...analyticsQueryOptions,
  });
};

export const useGetStaffDetailedConversationAnalytics = (
  staffId: string,
  filter: QueryFilter | null = null,
) => {
  return useQuery({
    queryFn: () => getStaffDetailedConversationAnalytics(staffId, filter),
    queryKey: staffKeys.detailedConversationAnalytics(staffId, toAnalyticsParams(filter)),
    ...analyticsQueryOptions,
    enabled: !!staffId,
  });
};

export const useGetTeamOverview = (filter: QueryFilter | null = null) => {
  return useQuery({
    queryFn: () => getTeamOverview(filter),
    queryKey: teamKeys.overview(toAnalyticsParams(filter)),
    ...analyticsQueryOptions,
  });
};

export const useGetTeamDetailedMetrics = (teamId: string, filter: QueryFilter | null = null) => {
  return useQuery({
    queryFn: () => getTeamDetailedMetrics(teamId, filter),
    queryKey: teamKeys.detailedMetrics(teamId, toAnalyticsParams(filter)),
    ...analyticsQueryOptions,
    enabled: !!teamId,
  });
};

import { useQuery } from "@tanstack/react-query";

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
    queryKey: ["conversationOverview", filter],
  });
};

export const useGetAverageConversationResponseTimeGraphData = (
  filter: QueryFilter | null = null,
) => {
  return useQuery({
    queryFn: () => getAverageConversationResponseTimeGraphData(filter),
    queryKey: ["conversationAverageResponseTime", filter],
  });
};

export const useGetResolvedConversationStats = (filter: QueryFilter) => {
  return useQuery({
    queryFn: () => getResolvedConversationStats(filter),
    queryKey: ["conversationResolvedStats", filter],
  });
};

export const useGetConversationAccountDistribution = (filter: QueryFilter | null = null) => {
  return useQuery({
    queryFn: () => getConversationAccountDistribution(filter),
    queryKey: ["ConversationAccountDistribution", filter],
  });
};

export const useGetConversationQuickStats = (filter: QueryFilter | null = null) => {
  return useQuery({
    queryFn: () => getConversationQuickStats(filter),
    queryKey: ["ConversationQuickStats", filter],
  });
};
export const useGetStaffPerformanceonConversation = (filter: QueryFilter | null = null) => {
  return useQuery({
    queryFn: () => getStaffPerformanceonConversation(filter),
    queryKey: ["StaffPerformanceonConversation", filter],
  });
};

export const useGetStaffDetailedConversationAnalytics = (
  staffId: string,
  filter: QueryFilter | null = null,
) => {
  return useQuery({
    queryFn: () => getStaffDetailedConversationAnalytics(staffId, filter),
    queryKey: ["StaffDetailedConversationAnalytics", staffId, filter],
    enabled: !!staffId,
  });
};

export const useGetTeamOverview = (filter: QueryFilter | null = null) => {
  return useQuery({
    queryFn: () => getTeamOverview(filter),
    queryKey: ["teamoverview", filter],
  });
};

export const useGetTeamDetailedMetrics = (teamId: string, filter: QueryFilter | null = null) => {
  return useQuery({
    queryFn: () => getTeamDetailedMetrics(teamId, filter),
    queryKey: ["teamdetailedmetrics", teamId, filter],
    enabled: !!teamId,
  });
};

import { useQuery } from "@tanstack/react-query";

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

export const useGetConversationOverView = (filter) => {
  return useQuery({
    queryFn: () => getConversationOverView(filter),
    queryKey: ["conversationOverview", filter],
  });
};

export const useGetAverageConversationResponseTimeGraphData = (filter = null) => {
  return useQuery({
    queryFn: () => getAverageConversationResponseTimeGraphData(filter),
    queryKey: ["conversationAverageResponseTime", filter],
  });
};

export const useGetResolvedConversationStats = (filter) => {
  return useQuery({
    queryFn: () => getResolvedConversationStats(filter),
    queryKey: ["conversationResolvedStats", filter],
  });
};

export const useGetConversationAccountDistribution = (filter = null) => {
  return useQuery({
    queryFn: () => getConversationAccountDistribution(filter),
    queryKey: ["ConversationAccountDistribution", filter],
  });
};

export const useGetConversationQuickStats = (filter = null) => {
  return useQuery({
    queryFn: () => getConversationQuickStats(filter),
    queryKey: ["ConversationQuickStats", filter],
  });
};
export const useGetStaffPerformanceonConversation = (filter = null) => {
  return useQuery({
    queryFn: () => getStaffPerformanceonConversation(filter),
    queryKey: ["StaffPerformanceonConversation", filter],
  });
};

export const useGetStaffDetailedConversationAnalytics = (staffId, filter = null) => {
  return useQuery({
    queryFn: () => getStaffDetailedConversationAnalytics(staffId, filter),
    queryKey: ["StaffDetailedConversationAnalytics", staffId, filter],
    enabled: !!staffId,
  });
};

export const useGetTeamOverview = (filter = null) => {
  return useQuery({
    queryFn: () => getTeamOverview(filter),
    queryKey: ["teamoverview", filter],
  });
};

export const useGetTeamDetailedMetrics = (teamId, filter = null) => {
  return useQuery({
    queryFn: () => getTeamDetailedMetrics(teamId, filter),
    queryKey: ["teamdetailedmetrics", teamId, filter],
    enabled: !!teamId,
  });
};

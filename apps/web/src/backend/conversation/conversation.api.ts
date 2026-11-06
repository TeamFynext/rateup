import type { QueryFilter } from "@/types/api.ts";

import { ANALYTICS_TIMEOUT_MS, analyticsRequestParams } from "../analytics/analyticsFilter";
import { axiosClient } from "../apiClient";
import { CONTACT_BASE_URL } from "../campaign/contacts/contacts.api";

const baseUrl = `${CONTACT_BASE_URL}/conversations`;

/** Encoded, normalised params and the analytics timeout — see analyticsFilter.ts. */
const analyticsRequest = (filter: QueryFilter | null | undefined) => ({
  params: analyticsRequestParams(filter),
  timeout: ANALYTICS_TIMEOUT_MS,
});

export const getConversationOverView = async (
  filter: QueryFilter,
): Promise<ConversationOverviewStats> => {
  const response = await axiosClient.get<ConversationOverviewStats>(
    `${baseUrl}/overview`,
    analyticsRequest(filter),
  );
  return response.data;
};

export interface ConversationOverviewStats {
  totalConversations: number;
  /** Seconds; null when no conversation in the range has had a reply. */
  averageResponseTime: number | null;
  resolutionRate: number;
  averageResponseTimeByAgent: number | null;
}
export interface ConversationResponseStats {
  period: string;
  averageResponseTime: number;
}

export const getAverageConversationResponseTimeGraphData = async (
  filter: QueryFilter | null = null,
): Promise<ConversationResponseStats[]> => {
  const response = await axiosClient.get<ConversationResponseStats[]>(
    `${baseUrl}/conversation-response-stats`,
    analyticsRequest(filter),
  );
  return response.data;
};
export interface ConversationResolvedResponse {
  resolvedCount: number;
  totalCount: number;
  date: string;
}
export const getResolvedConversationStats = async (
  filter: QueryFilter,
): Promise<ConversationResolvedResponse[]> => {
  const response = await axiosClient.get<ConversationResolvedResponse[]>(
    `${baseUrl}/conversation-resolved-stats`,
    analyticsRequest(filter),
  );
  return response.data;
};

export interface ConversationAccountDistribution {
  conversationCount: number;
  phoneId: string;
  ibaId: string;
  phone: string;
  sourcePlatform: string;
}

export const getConversationAccountDistribution = async (
  filter: QueryFilter,
): Promise<ConversationAccountDistribution[]> => {
  const response = await axiosClient.get<ConversationAccountDistribution[]>(
    `${baseUrl}/account-distribution`,
    analyticsRequest(filter),
  );
  return response.data;
};

export interface ConversationQuickStats {
  newConversations: number;
  resolved: number;
  conversationInProgress: number;
  staffOnline: number;
  totalStaff: number;
  resolvedRateDifference: number;
}

export const getConversationQuickStats = async (
  filter: QueryFilter | null,
): Promise<ConversationQuickStats> => {
  const response = await axiosClient.get<ConversationQuickStats>(
    `${baseUrl}/quick-stats`,
    analyticsRequest(filter),
  );
  return response.data;
};

export interface StaffPerformanceonConversation {
  staff: {
    userId: string;
    name: string;
    status: string;
    email: string;
    profilePhoto: string | null;
  };
  totalAssignedConversations: number;
  totalClosedConversations: number;
  totalMessagesHandled: number;
  /** Seconds; null when the agent has no first responses in the range. */
  averageResponseTime: number | null;
  responseTimeRateByLastWeek: number;
  messagesHandledRateByLastWeek: number;
}

export const getStaffPerformanceonConversation = async (
  filter: QueryFilter | null,
): Promise<StaffPerformanceonConversation[]> => {
  const response = await axiosClient.get<StaffPerformanceonConversation[]>(
    `${baseUrl}/staff-metrics`,
    analyticsRequest(filter),
  );
  return response.data;
};

export interface StaffDetailedConversationAnalytics {
  weeklyMessageStats: {
    date: string;
    messageCount: number;
  }[];
  recentConversations: {
    id: string;
    customer: {
      name: string;
      phone: string;
    };
    topic: string;
    duration: string;
    lastRespondedAt: string;
    status: string;
  }[];
  metrics: {
    resolutionRate: number;
    firstResponseTime: string;
    avgHandlingTime: number;
  };
  userPerformance: {
    name: string;
    email: string;
    profilePhoto?: string | null;
    status: string;
    totalAssignedConversations: number;
    totalClosedConversations: number;
    totalMessagesHandled: number;
    averageResponseTime: number;
    responseTimeRateByLastWeek: number;
    resolutionRateByLastWeek: number;
    messagesHandledRateByLastWeek: number;
    conversationsTransferred: number;
    conversationsRecieved: number;
  };
}
export const getStaffDetailedConversationAnalytics = async (
  staffId: string,
  filter: QueryFilter | null,
): Promise<StaffDetailedConversationAnalytics> => {
  const response = await axiosClient.get<StaffDetailedConversationAnalytics>(
    `${baseUrl}/staff-detailed-analytics/${staffId}`,
    analyticsRequest(filter),
  );
  return response.data;
};

/** One team's conversation workload for a range. */
export interface TeamOverviewRow {
  teamId: string;
  teamName: string;
  teamColor?: string | null;
  teamMembers?: number;
  teamMembersOnline?: number;
  messagesSent?: number;
  assignedConversations?: number;
  averageResponseTime?: number | null;
}

export const getTeamOverview = async (filter: QueryFilter | null) => {
  const response = await axiosClient.get<TeamOverviewRow[]>(
    `${baseUrl}/team-overview`,
    analyticsRequest(filter),
  );
  return response.data;
};

/** Per-agent slice of a team's conversation metrics. */
export interface TeamMemberMetrics {
  userId: string;
  name: string;
  profilePhoto?: string | null;
  onlineStatus?: string;
  averageResponseTime: number;
  messagesHandled: number;
  staffActiveChats: number;
}

export interface TeamDetailedMetrics {
  teamName?: string;
  teamColor?: string;
  teamMembers?: number;
  teamMembersOnline?: number;
  activeChats?: number;
  averageResponseTime: number;
  averageResponseTimeComparedToLastWeek?: number;
  resolutionRate?: number;
  resolutionRateComparedToLastWeek?: number;
  members: TeamMemberMetrics[];
}

export const getTeamDetailedMetrics = async (teamId: string, filter: QueryFilter | null) => {
  const response = await axiosClient.get<TeamDetailedMetrics>(
    `${baseUrl}/team-metrics/${teamId}`,
    analyticsRequest(filter),
  );
  return response.data;
};

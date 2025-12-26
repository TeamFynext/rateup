import { axiosClient } from "../apiClient";
import { CONTACT_BASE_URL } from "../campaign/contacts/contacts.api";

const baseUrl = `${CONTACT_BASE_URL}/conversations`;

export const getConversationOverView = async (
  filter,
): Promise<ConversationOverviewStats> => {
  const query = Object.entries(filter)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const response = await axiosClient.get<ConversationOverviewStats>(
    `${baseUrl}/overview?${query}`,
  );
  return response.data;
};

export interface ConversationOverviewStats {
  totalConversations: number;
  averageResponseTime: number;
  resolutionRate: number;
}
export interface ConversationResponseStats {
  period: string;
  averageResponseTime: number;
}

export const getAverageConversationResponseTimeGraphData = async (
  filter = null,
): Promise<ConversationResponseStats[]> => {
  const query = Object.entries(filter || {})
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const response = await axiosClient.get<ConversationResponseStats[]>(
    `${baseUrl}/conversation-response-stats?${query}`,
  );
  return response.data;
};
export interface ConversationResolvedResponse {
  resolvedCount: number;
  totalCount: number;
  date: string;
}
export const getResolvedConversationStats = async (
  filter,
): Promise<ConversationResolvedResponse[]> => {
  const query = Object.entries(filter)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const response = await axiosClient.get<ConversationResolvedResponse[]>(
    `${baseUrl}/conversation-resolved-stats?${query}`,
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
  filter,
): Promise<ConversationAccountDistribution[]> => {
  const query = Object.entries(filter || {})
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const response = await axiosClient.get<ConversationAccountDistribution[]>(
    `${baseUrl}/account-distribution?${query}`,
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
  filter,
): Promise<ConversationQuickStats> => {
  const query = Object.entries(filter || {})
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const response = await axiosClient.get<ConversationQuickStats>(
    `${baseUrl}/quick-stats?${query}`,
  );
  return response.data;
};

export interface StaffPerformanceonConversation {
  staff: {
    userId: string;
    name: string;
    status: string;
    email: string;
  };
  totalAssignedConversations: number;
  totalClosedConversations: number;
  totalMessagesHandled: number;
  averageResponseTime: number;
  responseTimeRateByLastWeek: number;
  messagesHandledRateByLastWeek: number;
}

export const getStaffPerformanceonConversation = async (
  filter,
): Promise<StaffPerformanceonConversation[]> => {
  const query = Object.entries(filter || {})
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const response = await axiosClient.get<StaffPerformanceonConversation[]>(
    `${baseUrl}/staff-metrics?${query}`,
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
    status: string;
    totalAssignedConversations: number;
    totalClosedConversations: number;
    totalMessagesHandled: number;
    averageResponseTime: number;
    responseTimeRateByLastWeek: number;
    messagesHandledRateByLastWeek: number;
  };
}
export const getStaffDetailedConversationAnalytics = async (
  staffId,
  filter,
): Promise<StaffDetailedConversationAnalytics> => {
  const query = Object.entries(filter || {})
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const response = await axiosClient.get<StaffDetailedConversationAnalytics>(
    `${baseUrl}/staff-detailed-analytics/${staffId}?${query}`,
  );
  return response.data;
};

export const getTeamOverview = async (filter) => {
  const query = Object.entries(filter || {})
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const response = await axiosClient.get(`${baseUrl}/team-overview?${query}`);
  return response.data;
};

export const getTeamDetailedMetrics = async (teamId) => {
  const response = await axiosClient.get(`${baseUrl}/team-metrics/${teamId}`);
  return response.data;
};

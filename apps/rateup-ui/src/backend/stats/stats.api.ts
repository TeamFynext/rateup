import { axiosClient } from "../apiClient";

const STATS_URL = "/stats";

/** Per-org usage counters backing the billing page's quota meters. */
export interface UsageStats {
  teamsCount: number;
  teamMembersCount: number;
  surveysCount: number;
  surveyResponsesCount: number;
  monthlySurveyResponses: number;
  monthlyConversationsCount: number;
  annualConversationsCount: number;
  aiPromptTokensCount: number;
  aiCompletionTokensCount: number;
  loyaltyCustomerCount: number;
  loyaltyRewardCount: number;
  loyaltyActionCount: number;
}

export async function getUsageStats() {
  return (await axiosClient.get(`${STATS_URL}`)).data as UsageStats;
}

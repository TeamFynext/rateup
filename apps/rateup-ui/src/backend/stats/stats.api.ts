import { axiosClient } from "../apiClient";

const STATS_URL = "/stats";

/** Per-org usage counters backing the billing page's quota meters. */
export interface UsageStats {
  teamsCount: number;
  teamMembersCount: number;
  surveysCount: number;
  surveyResponsesCount: number;
  monthlySurveyResponses: number;
  /**
   * Inbox-ticket counters. Analytics only — an inbox ticket stays open until a human
   * or an automation closes it, so it is not the plan meter. Use the metered counters
   * below for anything quota-related.
   */
  monthlyConversationsCount: number;
  annualConversationsCount: number;
  /** Self-derived 24h conversation windows — the plan allowance unit. */
  monthlyMeteredConversationsCount: number;
  annualMeteredConversationsCount: number;
  aiPromptTokensCount: number;
  aiCompletionTokensCount: number;
  loyaltyCustomerCount: number;
  loyaltyRewardCount: number;
  loyaltyActionCount: number;
}

export async function getUsageStats() {
  return (await axiosClient.get(`${STATS_URL}`)).data as UsageStats;
}

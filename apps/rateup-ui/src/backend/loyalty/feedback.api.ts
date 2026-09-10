import { axiosClient } from "@/backend/apiClient.ts";
import type { WaFlowStatus } from "@/types/enums.ts";

import { LOYALTY_BASE } from "./base.ts";
import type { LoyaltyRewardStatus } from "./reward.api.ts";

/**
 * Loyalty → Feedback: the selected WhatsApp Flow, its review reward and its results.
 * Mirrors `rateup-api/src/modules/loyalty/feedback/feedback.schema.ts`. The flow itself is
 * created in WhatsApp → Flow with the Loyalty feedback category; Feedback only selects it.
 */

const FEEDBACK_BASE = `${LOYALTY_BASE}/feedback`;

/** A flow Feedback may select, and — when it may not — why. */
export interface FeedbackFlowCandidate {
  dbFlowId: string;
  name: string;
  status: WaFlowStatus | string;
  pendingSave: boolean;
  version: number;
  eligible: boolean;
  reason: string | null;
}

export interface FeedbackSetting {
  id: string;
  enabled: boolean;
  sendDelayMinutes: number;
  cooldownDays: number;
  teamId: string;
  rewardId: string | null;
  happyMinRating: number;
}

export interface FeedbackFlow {
  dbFlowId: string;
  flowId: string | null;
  name: string;
  status: WaFlowStatus | string;
  pendingSave: boolean;
  surveyId: string;
  version: number;
}

export const FEEDBACK_TEMPLATE_STEPS = ["pending", "approved", "rejected"] as const;
export type FeedbackTemplateStep = (typeof FEEDBACK_TEMPLATE_STEPS)[number];

/** The FLOW-button template that reaches customers outside the 24-hour service window. */
export interface FeedbackTemplate {
  id: string;
  name: string;
  status: FeedbackTemplateStep;
}

export interface FeedbackCounts {
  scheduled: number;
  sent: number;
  completed: number;
  happy: number;
  reviewClicks: number;
  rewardsGranted: number;
}

export interface FeedbackState {
  programExists: boolean;
  setting: FeedbackSetting | null;
  flow: FeedbackFlow | null;
  template: FeedbackTemplate | null;
  team: { id: string; name: string; googleLink: string | null } | null;
  reward: { id: string; name: string; status: LoyaltyRewardStatus | string } | null;
  counts: FeedbackCounts;
}

export interface FeedbackSetupPayload {
  dbFlowId: string;
  teamId: string;
}

export type FeedbackSettingsPatch = Partial<
  Pick<
    FeedbackSetting,
    "enabled" | "sendDelayMinutes" | "cooldownDays" | "teamId" | "rewardId" | "happyMinRating"
  >
>;

export const FEEDBACK_REQUEST_STATUSES = [
  "SCHEDULED",
  "SENT",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
] as const;
export type FeedbackRequestStatus = (typeof FEEDBACK_REQUEST_STATUSES)[number];

export interface FeedbackRequestRow {
  id: string;
  customerName: string;
  phoneMasked: string;
  status: FeedbackRequestStatus;
  happy: boolean | null;
  overallRating: number | null;
  /** "interactive" inside the service window, "template" outside it. */
  channel: string | null;
  failReason: string | null;
  scheduledFor: string;
  sentAt: string | null;
  completedAt: string | null;
  reviewClickedAt: string | null;
  rewardGrantedAt: string | null;
}

export const FEEDBACK_PERIODS = ["30d", "90d", "12m"] as const;
export type FeedbackPeriod = (typeof FEEDBACK_PERIODS)[number];

export interface FeedbackResults {
  period: { key: FeedbackPeriod; label: string; start: string; end: string };
  metrics: {
    sent: number;
    completed: number;
    /** 0–1, null until something has been sent. */
    completionRate: number | null;
    happy: number;
    /** 0–1, null until something has been completed. */
    happyRate: number | null;
    reviewClicks: number;
    rewardsGranted: number;
  };
  questionAverages: Array<{
    elementId: string;
    title: string;
    average: number | null;
    count: number;
  }>;
  recent: FeedbackRequestRow[];
}

export interface FeedbackRequestsQuery {
  page: number;
  pageSize: number;
  status?: FeedbackRequestStatus;
}

export interface FeedbackRequestsPage {
  rows: FeedbackRequestRow[];
  total: number;
  page: number;
  pageSize: number;
}

export const getFeedbackFlowCandidates = async (): Promise<{ flows: FeedbackFlowCandidate[] }> => {
  const response = await axiosClient.get(`${FEEDBACK_BASE}/flows`);
  return response.data;
};

export const getFeedbackState = async (): Promise<FeedbackState> => {
  const response = await axiosClient.get(FEEDBACK_BASE);
  return response.data;
};

export const setupFeedback = async (payload: FeedbackSetupPayload): Promise<FeedbackState> => {
  const response = await axiosClient.post(`${FEEDBACK_BASE}/setup`, payload);
  return response.data;
};

export const updateFeedbackSettings = async (
  patch: FeedbackSettingsPatch,
): Promise<FeedbackState> => {
  const response = await axiosClient.put(FEEDBACK_BASE, patch);
  return response.data;
};

/** Publishes the flow at Meta if needed and submits the FLOW-button template for review. */
export const submitFeedbackFlow = async (): Promise<FeedbackState> => {
  const response = await axiosClient.post(`${FEEDBACK_BASE}/submit`);
  return response.data;
};

/** Forgets the selection and stops asking; the flow itself is left alone. */
export const detachFeedback = async (): Promise<void> => {
  await axiosClient.post(`${FEEDBACK_BASE}/detach`);
};

export const getFeedbackResults = async (
  period: FeedbackPeriod,
  tz?: string,
): Promise<FeedbackResults> => {
  const response = await axiosClient.get(`${FEEDBACK_BASE}/results`, {
    params: { period, ...(tz ? { tz } : {}) },
  });
  return response.data;
};

export const getFeedbackRequests = async (
  query: FeedbackRequestsQuery,
): Promise<FeedbackRequestsPage> => {
  const response = await axiosClient.get(`${FEEDBACK_BASE}/requests`, { params: query });
  return response.data;
};

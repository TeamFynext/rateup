import type { RequestPayload } from "@/types/api.ts";
import type {
  CampaignParticipantStatus,
  CampaignRetryStrategy,
  CampaignStatus,
} from "@/types/enums.ts";
import type {
  CampaignAnalytics,
  CampaignRetryPolicy,
  CampaignSend,
  CampaignSendParticipantsPage,
} from "@/types/global";
import { downloadBlob } from "@/utils/downloadBlob.ts";

import { axiosClient } from "../apiClient";

export const getCampaigns = async (type: string) => {
  const res = await axiosClient.get(`/campaign/?type=${type}`);
  return res;
};

export const getCampaignsByTeam = async (teamId: string) => {
  const res = await axiosClient.get(`/campaign?teamId=${teamId}`);
  return res;
};

export const createCampaign = async (data: RequestPayload) => {
  const res = await axiosClient.post("/campaign/", data);
  return res;
};

export const getCampaignById = async (campaignId: string) => {
  const res = await axiosClient.get(`/campaign?campaignId=${campaignId}`);
  return res?.data;
};

export const updateCampaign = async ({
  data,
  campaignId,
}: {
  data: RequestPayload;
  campaignId: string;
}) => {
  const res = await axiosClient.put(`/campaign/${campaignId}`, data);
  return res;
};

export const deleteCampaign = async (campaignId: string) => {
  const res = await axiosClient.delete(`/campaign/${campaignId}`);
  return res;
};

/** What a campaign would cost against the org's conversation allowance, before sending. */
export interface CampaignSendPreflight {
  recipients: number;
  /** False when the plan is not metered — there is nothing to run out of. */
  metered: boolean;
  max?: number;
  used?: number;
  remaining?: number;
  isAnnual: boolean;
  /** The allowance is already spent: the send would deliver nothing. */
  exhausted: boolean;
  /** Recipients beyond what is left. An upper bound — see the API's campaign.preflight.ts. */
  shortfall: number;
}

export const getCampaignSendPreflight = async (
  campaignId: string,
  sendToStatuses: CampaignParticipantStatus[],
) => {
  const query = sendToStatuses.map((status) => `sendToStatuses=${status}`).join("&");
  return (await axiosClient.get(`/campaign/${campaignId}/send-preflight?${query}`))
    .data as CampaignSendPreflight;
};

/**
 * Body of `POST /campaign/:id/send`, mirroring `sendCampaignInputSchema`.
 *
 * An object rather than the run of eight optional positionals it used to be:
 * `participantIds` was the ninth, and a cohort silently landing in the
 * `dailySendLimit` slot is exactly the mistake positional arguments invite.
 */
export interface SendCampaignBody {
  sendToStatuses: CampaignParticipantStatus[];
  sentCampaignChoice: string;
  /** One recipient — the participants table's per-row "Retry now". */
  participantId?: string;
  /** An exact cohort, for the rows ticked in the participants table. */
  participantIds?: string[];
  campaignSentAt?: Date;
  status?: CampaignStatus;
  type?: string;
  dailySendLimit?: number | null;
}

export const sendCampaign = async (campaignId: string, body: SendCampaignBody) => {
  return axiosClient.post(`/campaign/${campaignId}/send`, body);
};

// this get req is primarily used in flows result page
export const getCampaignFilterForFlows = async (surveyId: string) => {
  return (await axiosClient.get(`/campaign/flow/filter?surveyId=${surveyId}`)).data as {
    id: string;
    name: string;
  }[];
};

export const campaignResponseDownloadById = async ({
  campaignId,
  selectedDripStage,
  format = "xlsx",
}: {
  campaignId: string;
  selectedDripStage?: string;
  format?: "xlsx" | "ods";
}) => {
  const params = new URLSearchParams({ format });
  if (selectedDripStage && selectedDripStage !== "all") {
    params.set("selectedDripStage", selectedDripStage);
  }
  const response = await axiosClient.post(
    `/campaign/${campaignId}/download?${params.toString()}`,
    {},
    {
      timeout: 25000,
      responseType: "blob",
    },
  );
  const blob = new Blob([response.data], {
    type: response.headers["content-type"] as string,
  });

  return downloadBlob(blob, response?.headers?.filename ?? `file.${format}`);
};

export async function getCampaignStatsById(campaignId: string, selectedDripStage?: string) {
  return (
    await axiosClient.get(
      `/campaign/${campaignId}/stats?selectedDripStage=${selectedDripStage ?? "all"}`,
    )
  ).data;
}

// ── Per-attempt analytics ─────────────────────────────────────────────────────
// Every send and resend is a CampaignSend row on the API side, so the attempts
// table and the funnel are reads rather than anything reconstructed here.

export const getCampaignSends = async (campaignId: string) => {
  return (await axiosClient.get(`/campaign/${campaignId}/sends`)).data as CampaignSend[];
};

export interface CampaignSendParticipantsFilters {
  status?: CampaignParticipantStatus;
  page?: number;
  pageSize?: number;
}

export const getCampaignSendParticipants = async (
  campaignId: string,
  sendId: string,
  filters: CampaignSendParticipantsFilters = {},
) => {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  const query = params.toString();
  return (
    await axiosClient.get(
      `/campaign/${campaignId}/sends/${sendId}/participants${query ? `?${query}` : ""}`,
    )
  ).data as CampaignSendParticipantsPage;
};

export const getCampaignAnalytics = async (campaignId: string) => {
  return (await axiosClient.get(`/campaign/${campaignId}/analytics`)).data as CampaignAnalytics;
};

// ── Automatic retries ─────────────────────────────────────────────────────────

/** Null when the campaign has no policy, which is how "retries off" is stored. */
export const getCampaignRetryPolicy = async (campaignId: string) => {
  return (await axiosClient.get(`/campaign/${campaignId}/retry-policy`))
    .data as CampaignRetryPolicy | null;
};

export interface CampaignRetryPolicyInput {
  enabled: boolean;
  strategy: CampaignRetryStrategy;
  maxAttempts: number;
  intervalHours: number;
  windowEndsAt?: string | null;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  timezone: string;
}

export const updateCampaignRetryPolicy = async ({
  campaignId,
  data,
}: {
  campaignId: string;
  data: CampaignRetryPolicyInput;
}) => {
  return (await axiosClient.put(`/campaign/${campaignId}/retry-policy`, data))
    .data as CampaignRetryPolicy;
};

export const cancelPendingRetries = async (campaignId: string) => {
  return (await axiosClient.post(`/campaign/${campaignId}/retries/cancel`, {})).data as {
    cancelled: number;
    message: string;
  };
};

/** A rehearsal send. Opens no send session and moves no counters. */
export const sendCampaignTest = async ({
  campaignId,
  phone,
}: {
  campaignId: string;
  phone: string;
}) => {
  return (await axiosClient.post(`/campaign/${campaignId}/send-test`, { phone })).data as {
    messageId?: string;
    message: string;
  };
};

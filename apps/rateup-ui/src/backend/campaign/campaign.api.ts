import type { RequestPayload } from "@/types/api.ts";
import type { CampaignParticipantStatus, CampaignStatus } from "@/types/enums.ts";
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

export const sendCampaign = async (
  campaignId: string,
  sendToStatuses: CampaignParticipantStatus[],
  sentCampaignChoice: string,
  participantId?: string,
  campaignSentAt?: Date,
  status?: CampaignStatus,
  type?: string,
  dailySendLimit?: number | null,
) => {
  return axiosClient.post(`/campaign/${campaignId}/send`, {
    sendToStatuses,
    participantId,
    campaignSentAt,
    sentCampaignChoice,
    status,
    type,
    dailySendLimit,
  });
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

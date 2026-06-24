import type { CampaignParticipantStatus, CampaignStatus } from "@/types/enums.ts";
import { downloadBlob } from "@/utils/downloadBlob.ts";

import { axiosClient } from "../apiClient";

export const getCampaigns = async (type) => {
  const res = await axiosClient.get(`/campaign/?type=${type}`);
  return res;
};

export const getCampaignsByTeam = async (teamId: string) => {
  const res = await axiosClient.get(`/campaign?teamId=${teamId}`);
  return res;
};

export const createCampaign = async (data) => {
  const res = await axiosClient.post("/campaign/", data);
  return res;
};

export const getCampaignById = async (campaignId) => {
  const res = await axiosClient.get(`/campaign?campaignId=${campaignId}`);
  return res?.data;
};

export const updateCampaign = async ({ data, campaignId }) => {
  const res = await axiosClient.put(`/campaign/${campaignId}`, data);
  return res;
};

export const deleteCampaign = async (campaignId) => {
  const res = await axiosClient.delete(`/campaign/${campaignId}`);
  return res;
};

export const sendCampaign = async (
  campaignId: string,
  sendToStatuses: CampaignParticipantStatus[],
  sentCampaignChoice: string,
  participantId?: string,
  campaignSentAt?: Date,
  status?: CampaignStatus,
  type?: string,
) => {
  return axiosClient.post(`/campaign/${campaignId}/send`, {
    sendToStatuses,
    participantId,
    campaignSentAt,
    sentCampaignChoice,
    status,
    type,
  });
};

// this get req is primarily used in flows result page
export const getCampaignFilterForFlows = async (surveyId: string) => {
  return (await axiosClient.get(`/campaign/flow/filter?surveyId=${surveyId}`)).data as {
    id: string;
    name: string;
  }[];
};

export const campaignResponseDownloadById = async ({ campaignId, selectedDripStage }) => {
  const response = await axiosClient.post(
    selectedDripStage && selectedDripStage !== "all"
      ? `/campaign/${campaignId}/download?selectedDripStage=${selectedDripStage}`
      : `/campaign/${campaignId}/download`,
    {},
    {
      timeout: 25000,
      responseType: "blob",
    },
  );
  const blob = new Blob([response.data], {
    type: response.headers["content-type"] as string,
  });

  return downloadBlob(blob, response?.headers?.filename ?? "file.xlsx");
};

export async function getCampaignStatsById(campaignId, selectedDripStage) {
  return (
    await axiosClient.get(
      `/campaign/${campaignId}/stats?selectedDripStage=${selectedDripStage ?? "all"}`,
    )
  ).data;
}

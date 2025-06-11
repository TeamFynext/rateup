import { saveAs } from "file-saver";

import { CampaignParticipantStatus, CampaignStatus } from "../../types/enums";
import { axiosClient } from "../apiClient";

export const getCampaigns = async () => {
  let res = await axiosClient.get("/campaign/");
  return res;
};

export const getCampaignsByTeam = async (teamId: string) => {
  let res = await axiosClient.get(`/campaign?teamId=${teamId}`);
  return res;
};

export const createCampaign = async (data) => {
  let res = await axiosClient.post("/campaign/", data);
  return res;
};

export const getCampaignById = async (campaignId) => {
  let res = await axiosClient.get(`/campaign?campaignId=${campaignId}`);
  return res?.data;
};

export const updateCampaign = async ({ data, campaignId }) => {
  let res = await axiosClient.put(`/campaign/${campaignId}`, data);
  return res;
};

export const deleteCampaign = async (campaignId) => {
  let res = await axiosClient.delete(`/campaign/${campaignId}`);
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

//this get req is primarily used in flows result page
export const getCampaignFilterForFlows = async (surveyId: string) => {
  return (await axiosClient.get(`/campaign/flow/filter?surveyId=${surveyId}`))
    .data as {
    id: string;
    name: string;
  }[];
};

export const campaignResponseDownloadById = async ({
  campaignId,
  selectedDripStage,
}) => {
  const response = await axiosClient.post(
    selectedDripStage
      ? `/campaign/${campaignId}/download?selectedDripStage=${selectedDripStage}`
      : `/campaign/${campaignId}/download`,
    {},
    {
      timeout: 25000,
      responseType: "blob",
    },
  );
  const blob = new Blob([response.data], {
    type: response.headers["content-type"],
  });

  return saveAs(blob, response?.headers?.filename ?? "file.xlsx");
};

export async function getCampaignStatsById(campaignId, selectedDripStage) {
  return (
    await axiosClient.get(
      `/campaign/${campaignId}/stats?selectedDripStage=${selectedDripStage ?? "all"}`,
    )
  ).data;
}

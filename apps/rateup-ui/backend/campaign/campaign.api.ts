import { CampaignParticipantStatus } from "../../types/enums";
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
  participantId?: string,
) => {
  let res = await axiosClient.post(`/campaign/${campaignId}/send`, {
    sendToStatuses,
    participantId,
  });
  return res;
};

//this get req is primarily used in flows result page
export const getCampaignFilterForFlows = async (surveyId: string) => {
  return (await axiosClient.get(`/campaign/flow/filter?surveyId=${surveyId}`))
    .data as {
    campaignName: string;
    campaignId: string;
    participantsContactIds: string[];
  }[];
};
//

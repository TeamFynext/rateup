import { axiosClient } from "../../apiClient";

export const addContactParticipants = async ({ data, campaignId }) => {
  let res = await axiosClient.post(
    `/campaign/${campaignId}/participants/contacts`,
    data,
  );
  return res;
};

export const addGroupParticipants = async ({ data, campaignId }) => {
  let res = await axiosClient.post(
    `/campaign/${campaignId}/participants/groups`,
    data,
  );
  return res;
};

export const getCampaignParticipants = async (campaignId) => {
  let res = await axiosClient.get(`/campaign/${campaignId}/participants`);
  return res;
};

export const addCampaignParticipants = async ({ data, campaignId }) => {
  let res = await axiosClient.post(
    `/campaign/${campaignId}/participants/`,
    data,
  );
  return res;
};

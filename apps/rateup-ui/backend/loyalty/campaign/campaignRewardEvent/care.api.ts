import { axiosClient } from "../../../apiClient";
import { LOYALTY_BASE } from "../../base";

const base = (campaignId: string) =>
  `${LOYALTY_BASE}/${campaignId}/reward-event`;

export type CreateRewardEventInput = {
  phone: string;
  transactionAmount?: number;
  referralCode?: string;
};
export async function createRewardEvent(
  campaignId: string,
  data: CreateRewardEventInput,
) {
  return await axiosClient.post(base(campaignId), data);
}

export async function getRewardEvents(campaignId: string) {
  return (await axiosClient.get(base(campaignId)))
    .data as LoyaltyCampaignRewardEvent[];
}

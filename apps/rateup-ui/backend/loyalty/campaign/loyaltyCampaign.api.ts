import { axiosClient } from "../../apiClient";
import { LOYALTY_BASE } from "../base";

const base = LOYALTY_BASE + "/campaign";

export async function getCampaigns() {
  return (await axiosClient.get(base)).data as LoyaltyCampaign[];
}
type CreateLoyaltyCampaignInput = Partial<Omit<LoyaltyCampaign, "id">>;
export async function createCampaign(campaign: CreateLoyaltyCampaignInput) {
  const res = await axiosClient.post(base, campaign);
  return res.data as LoyaltyCampaign;
}
export async function getCampaign(campaignId: string) {
  return (await axiosClient.get(base + "/" + campaignId))
    .data as LoyaltyCampaign;
}
export async function getPublicCampaign(campaignId: string) {
  return (await axiosClient.get(`${base}/public/${campaignId}`))
    .data as LoyaltyCampaign;
}
export async function updateCampaign(
  campaignId: string,
  campaign: Partial<LoyaltyCampaign>,
) {
  return await axiosClient.put(`${base}/${campaignId}`, campaign);
}
export async function deleteCampaign(id: string) {
  return await axiosClient.delete(base + "/" + id);
}

interface registerCampaignProps {
  phone: string;
  campaignId: string;
}
export async function registerCampaign({
  phone,
  campaignId,
}: registerCampaignProps) {
  return await axiosClient.post(`${base}/${campaignId}/register`, { phone });
}

export async function getCampaignParticipants(campaignId: string) {
  return (await axiosClient.get(`${base}/${campaignId}/participants`))
    .data as LoyaltyCustomer[];
}

interface LoyaltyInsightsBase {
  totalCustomers: number;
  totalPointsRewarded: number;
  totalPointsRedeemed: number;
}
export interface LoyaltyInsights extends LoyaltyInsightsBase {
  totalCampaigns: number;
}
interface LoyaltyCampaignInsights extends LoyaltyInsightsBase {
  totalTransactions: number;
  totalTransactionAmount: number;
  avgTransactionAmount: number;
}
export async function getLoyaltyCampaignInsights(campaignId: string) {
  return (await axiosClient.get(`${base}/${campaignId}/insights`))
    .data as LoyaltyCampaignInsights;
}
export async function getLoyaltyInsights() {
  return (await axiosClient.get(`${base}/insights`)).data as LoyaltyInsights;
}

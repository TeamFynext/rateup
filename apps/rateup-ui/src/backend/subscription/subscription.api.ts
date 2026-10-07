import { axiosClient } from "../apiClient";

const SUBSCRIPTION_URL = "/subscription";

export async function getUserSubscription() {
  return (await axiosClient.get(`${SUBSCRIPTION_URL}`)).data as Subscription;
}
export async function getSubscription(orgId: string) {
  return (await axiosClient.get(`${SUBSCRIPTION_URL}/${orgId}`)).data;
}
export async function getAllSubscriptions() {
  return (await axiosClient.get(`${SUBSCRIPTION_URL}/all`)).data as Array<Subscription>;
}
export async function updateSubscription(orgId: string, updatedData: object) {
  return (await axiosClient.put(`${SUBSCRIPTION_URL}/${orgId}`, updatedData)).data;
}

export async function getMessageStats(orgId: string, filter = "") {
  return (
    await axiosClient.get(`${SUBSCRIPTION_URL}/message-stats/${orgId}?${filter}`, { timeout: 0 })
  ).data;
}

/** Monthly active contacts. Uncapped plans answer `metered: false` with no ceiling. */
export interface ActiveContactBudget {
  metered: boolean;
  period: string;
  used: number;
  /** Plan allowance plus in-date contact packs. */
  max?: number;
  planMax?: number;
  addonContacts?: number;
  remaining?: number;
  exhausted: boolean;
}

/** Campaign credits. Plan credits are spent first, then packs, earliest expiry first. */
export interface CampaignCreditBudget {
  metered: boolean;
  period: string;
  planMax?: number;
  planUsed?: number;
  packRemaining?: number;
  /** Plan credits left plus pack credits left. */
  remaining?: number;
  exhausted: boolean;
}

/** `GET /subscription/usage` — the two plan meters for the calendar month (UTC). */
export interface SubscriptionUsage {
  period: string;
  resetsAt: string;
  activeContacts: ActiveContactBudget;
  campaignCredits: CampaignCreditBudget;
}

export async function getSubscriptionUsage() {
  return (await axiosClient.get(`${SUBSCRIPTION_URL}/usage`)).data as SubscriptionUsage;
}

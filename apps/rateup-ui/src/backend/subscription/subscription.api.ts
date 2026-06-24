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
export async function updateSubscription(
  orgId: string,
  updatedData: object,
  isMenuPlanChange: boolean = false,
) {
  const url = isMenuPlanChange
    ? `${SUBSCRIPTION_URL}/menu/${orgId}`
    : `${SUBSCRIPTION_URL}/${orgId}`;
  return (await axiosClient.put(url, updatedData)).data;
}

export async function getMessageStats(orgId, filter = "") {
  return (
    await axiosClient.get(`${SUBSCRIPTION_URL}/message-stats/${orgId}?${filter}`, { timeout: 0 })
  ).data;
}

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

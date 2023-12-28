import { axiosClient } from "../apiClient";

const SUBSCRIPTION_URL = "/subscription";

export async function getSubscription() {
  return (await axiosClient.get(`${SUBSCRIPTION_URL}`)).data;
}

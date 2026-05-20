import { axiosClient } from "../apiClient";

const STATS_URL = "/stats";

export async function getUsageStats() {
  return (await axiosClient.get(`${STATS_URL}`)).data;
}

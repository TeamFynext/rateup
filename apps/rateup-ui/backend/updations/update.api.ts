//For New Migrations and Updations

import { axiosClient } from "../apiClient";

const baseUrl = "/public/update";

export async function updateUsageStats() {
  return await axiosClient.post(`${baseUrl}/usage-stats`);
}

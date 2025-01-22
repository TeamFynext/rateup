//For New Migrations and Updations

import { axiosClient } from "../apiClient";

const baseUrl = "/public/update";

export const updateGoogleReviewQuestions = async () => {
  const response = await axiosClient.post(
    "/public/update/updateGoogleReviewQuestions",
  );
  return response.data;
};

export async function updateThemeTitleSt() {
  return await axiosClient.post(`/public/update/update-theme-title`);
}

export async function updateUsageStatsResetDate() {
  return await axiosClient.post(`${baseUrl}/usage-stats-reset`);
}

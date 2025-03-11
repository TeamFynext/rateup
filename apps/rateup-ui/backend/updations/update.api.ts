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

export async function updateSubscriptionFeature() {
  return await axiosClient.post(`${baseUrl}/subscription/free`, null, {
    timeout: 0,
  });
}

export async function updateContactMessageTime() {
  return await axiosClient.post(`${baseUrl}/inbox/time`, null, {
    timeout: 0,
  });
}

export async function updateInboxStatus() {
  return await axiosClient.post(`${baseUrl}/inbox/status`, null, {
    timeout: 0,
  });
}

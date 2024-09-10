//For New Migrations and Updations

import { axiosClient } from "../apiClient";

export const updateWebSurveyPagesTheme = async () => {
  const response = await axiosClient.post(
    "/public/update/updateWebSurveyPagesTheme",
  );
  return response.data;
};

export async function updateFreePlanSubscription() {
  return await axiosClient.post(`/public/update/subscription/freeplan`);
}

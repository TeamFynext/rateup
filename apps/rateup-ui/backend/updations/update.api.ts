//For New Migrations and Updations

import { axiosClient } from "../apiClient";

export const updateGoogleReviewQuestions = async () => {
  const response = await axiosClient.post(
    "/public/update/updateGoogleReviewQuestions",
  );
  return response.data;
};

export async function updateFreePlanSubscription() {
  return await axiosClient.post(`/public/update/subscription/freeplan`);
}

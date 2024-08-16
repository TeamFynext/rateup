//For New Migrations and Updations

import { axiosClient } from "../apiClient";

export const updateAllSurveys = async () => {
  const response = await axiosClient.get(`/public/update/survey-editor`);
  return response.data;
};

export const updateDatabase = async () => {
  const response = await axiosClient.get(`/public/update/db`);
  return response.data;
};

export async function transferDataToIntegration(app) {
  return (await axiosClient.post(`/public/update/transfer-integration/${app}`))
    .data;
}

export const updatePageTypeQuestions = async () => {
  const response = await axiosClient.post(
    "/public/update/updatePageTypeQuestions",
  );
  return response.data;
};

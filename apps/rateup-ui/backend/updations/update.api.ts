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

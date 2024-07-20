//For New Migrations and Updations

import { axiosClient } from "../apiClient";

export const updateAllSurveys = async () => {
  const response = await axiosClient.post(`/public/update/survey-editor`);
  return response.data;
};

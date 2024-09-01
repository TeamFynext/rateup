//For New Migrations and Updations

import { axiosClient } from "../apiClient";

export const updateWebSurveyPagesTheme = async () => {
  const response = await axiosClient.post(
    "/public/update/updateWebSurveyPagesTheme",
  );
  return response.data;
};

export async function createHubSpotContacts() {
  const res = await axiosClient.post("/public/update/create-hubspot-contact");
  return res.data;
}

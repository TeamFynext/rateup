import { axiosClient } from "../apiClient";

const API_BASE_URL = "/apianalytics";

export async function getApiAnalyticsOverview(filter) {
  const query = Object.entries(filter)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const res = await axiosClient.get(`${API_BASE_URL}?${query}`);
  return res.data;
}

export async function getDeliveredFailedTrend(filter) {
  const query = Object.entries(filter)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const res = await axiosClient.get(`${API_BASE_URL}/trend?${query}`);
  return res.data;
}

export async function getTemplateOverview(filter) {
  const query = Object.entries(filter)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const res = await axiosClient.get(
    `${API_BASE_URL}/template-overview?${query}`,
  );
  return res.data;
}

export async function getTeamOverview(filter) {
  const query = Object.entries(filter)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const res = await axiosClient.get(`${API_BASE_URL}/team-overview?${query}`);
  return res.data;
}

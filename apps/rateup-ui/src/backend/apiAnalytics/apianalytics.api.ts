import type { QueryFilter } from "@/types/api.ts";

import { ANALYTICS_TIMEOUT_MS, analyticsRequestParams } from "../analytics/analyticsFilter";
import { axiosClient } from "../apiClient";

const API_BASE_URL = "/apianalytics";

/** Encoded, normalised params and the analytics timeout — see analyticsFilter.ts. */
const analyticsRequest = (filter: QueryFilter) => ({
  params: analyticsRequestParams(filter),
  timeout: ANALYTICS_TIMEOUT_MS,
});

export async function getApiAnalyticsOverview(filter: QueryFilter) {
  const res = await axiosClient.get(`${API_BASE_URL}`, analyticsRequest(filter));
  return res.data;
}

export async function getDeliveredFailedTrend(filter: QueryFilter) {
  const res = await axiosClient.get(`${API_BASE_URL}/trend`, analyticsRequest(filter));
  return res.data;
}

export async function getTemplateOverview(filter: QueryFilter) {
  const res = await axiosClient.get(`${API_BASE_URL}/template-overview`, analyticsRequest(filter));
  return res.data;
}

/** One row of the per-team messaging overview. */
export interface TeamApiOverviewRow {
  teamId: string;
  teamName: string;
  teamColor?: string;
  totalSent: number;
  successPercentage?: number;
}

export async function getTeamOverview(filter: QueryFilter) {
  const res = await axiosClient.get<TeamApiOverviewRow[]>(
    `${API_BASE_URL}/team-overview`,
    analyticsRequest(filter),
  );
  return res.data;
}

import type { QueryFilter } from "@/types/api.ts";

import { ANALYTICS_TIMEOUT_MS, analyticsRequestParams } from "../analytics/analyticsFilter";
import { axiosClient } from "../apiClient";

const API_BASE_URL = "/apianalytics";

/** Encoded, normalised params and the analytics timeout — see analyticsFilter.ts. */
const analyticsRequest = (filter: QueryFilter) => ({
  params: analyticsRequestParams(filter),
  timeout: ANALYTICS_TIMEOUT_MS,
});

/** Outbound delivery totals for a range; the changes are % against the previous period. */
export interface DeliveryOverview {
  totalMessages: number;
  totalMessagesChange?: number | null;
  deliveredMessages: number;
  deliveredPercentage?: number | null;
  failedMessages: number;
  failedPercentage?: number | null;
  avgDeliveryTimeSeconds?: number | null;
  avgDeliveryTimeChange?: number | null;
}

export interface DeliveryTrendPoint {
  time: string;
  deliveredMessages: number;
  failedMessages: number;
}

/** The server picks the bucket size from the range length and says which it used. */
export interface DeliveryTrend {
  granularity: string;
  trend: DeliveryTrendPoint[];
}

export interface TemplatePerformanceRow {
  templateName: string;
  templateCategory: string;
  lastUsed?: string | null;
  totalSent?: number | null;
  successPercentage?: number | null;
  failurePercentage?: number | null;
  avgDeliveryTimeSeconds?: number | null;
}

export interface TemplateOverview {
  categoryOverview?: { byCategory?: { category: string; count: number; percentage: number }[] };
  templatePerformance?: TemplatePerformanceRow[];
}

export async function getApiAnalyticsOverview(filter: QueryFilter) {
  const res = await axiosClient.get<DeliveryOverview>(`${API_BASE_URL}`, analyticsRequest(filter));
  return res.data;
}

export async function getDeliveredFailedTrend(filter: QueryFilter) {
  const res = await axiosClient.get<DeliveryTrend>(
    `${API_BASE_URL}/trend`,
    analyticsRequest(filter),
  );
  return res.data;
}

export async function getTemplateOverview(filter: QueryFilter) {
  const res = await axiosClient.get<TemplateOverview>(
    `${API_BASE_URL}/template-overview`,
    analyticsRequest(filter),
  );
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

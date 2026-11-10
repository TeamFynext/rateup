import { analyticsRequestParams, ANALYTICS_TIMEOUT_MS } from "@/backend/analytics/analyticsFilter";

import { axiosClient } from "../../apiClient";

const base = "/instagram/insights";

export const INSTAGRAM_INSIGHTS_RANGES = ["7d", "30d", "90d"] as const;
export type InstagramInsightsRange = (typeof INSTAGRAM_INSIGHTS_RANGES)[number];

/** The API's `code` when the Instagram token lacks `instagram_manage_insights`. */
export const INSIGHTS_PERMISSION_CODE = "instagram_insights_permission";

export interface InstagramAccountInsights {
  range: InstagramInsightsRange;
  since: string;
  until: string;
  /** Null where Graph had no number (refused, or the account is too small). */
  totals: {
    views: number | null;
    reach: number | null;
    totalInteractions: number | null;
    accountsEngaged: number | null;
  };
  followers: { count: number | null; gained: number | null; lost: number | null };
  daily: { date: string; reach: number | null }[];
  unavailable: string[];
}

export interface InstagramMediaInsights {
  mediaId: string;
  productType: string | null;
  likes: number | null;
  comments: number | null;
  views: number | null;
  reach: number | null;
  saved: number | null;
  shares: number | null;
  reposts: number | null;
  totalInteractions: number | null;
  replies: number | null;
  linkClicks: number | null;
  unavailable: string[];
  error?: "permission" | "unavailable";
}

export interface InstagramPostAttribution {
  mediaId: string;
  comments: number;
  commentsAnswered: number;
  dmsStarted: number;
  leads: number;
  orders: number;
  revenue: { currency: string; amount: number }[];
}

export interface InstagramPostReport {
  id: string;
  caption: string | null;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REEL";
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string;
  insights: InstagramMediaInsights;
  attribution: InstagramPostAttribution;
}

export interface InstagramPostsReport {
  range: InstagramInsightsRange;
  posts: InstagramPostReport[];
  needsReconnect: boolean;
}

export async function getInstagramAccountInsights(ibaId: string, range: InstagramInsightsRange) {
  const res = await axiosClient.get<{ success: boolean; data: InstagramAccountInsights }>(
    `${base}/${ibaId}/account`,
    { params: analyticsRequestParams({ range }), timeout: ANALYTICS_TIMEOUT_MS },
  );
  return res.data.data;
}

export async function getInstagramPostsInsights(ibaId: string, range: InstagramInsightsRange) {
  const res = await axiosClient.get<{ success: boolean; data: InstagramPostsReport }>(
    `${base}/${ibaId}/posts`,
    { params: analyticsRequestParams({ range }), timeout: ANALYTICS_TIMEOUT_MS },
  );
  return res.data.data;
}

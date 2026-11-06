import { WHATSAPP_URL } from ".";
import { axiosClient } from "../apiClient";

const ANALYTICS_URL = `${WHATSAPP_URL}/templates/analytics`;

/** Whether the WhatsApp account has opted in to Meta's template analytics. */
export type TemplateInsightsStatus = "enabled" | "disabled" | "unknown";

export interface TemplateButtonClicks {
  button: string;
  type: "url" | "quick_reply" | "other";
  clicks: number;
  /** Distinct WhatsApp accounts; Meta reports it for URL buttons only. */
  uniqueClicks: number | null;
}

export interface TemplateDailyPoint {
  date: string;
  sent: number;
  delivered: number;
  read: number;
  clicks: number;
}

export interface TemplateAnalytics {
  templateId: string;
  sent: number;
  delivered: number;
  read: number;
  clicks: number;
  buttons: TemplateButtonClicks[];
  /** In the WhatsApp account's currency; null when Meta reports no cost. */
  amountSpent: number | null;
  daily: TemplateDailyPoint[];
}

export interface TemplateAnalyticsResponse {
  status: TemplateInsightsStatus;
  templates: TemplateAnalytics[];
  from: string;
  to: string;
}

export interface TemplateAnalyticsParams {
  phoneId: string;
  templateIds: string[];
  days: number;
}

export async function getTemplateAnalytics({
  phoneId,
  templateIds,
  days,
}: TemplateAnalyticsParams) {
  const res = await axiosClient.get(ANALYTICS_URL, {
    params: { phoneId, templateIds: templateIds.join(","), days },
  });
  return res.data as TemplateAnalyticsResponse;
}

export async function getTemplateInsightsStatus(phoneId: string) {
  const res = await axiosClient.get(`${ANALYTICS_URL}/status`, { params: { phoneId } });
  return res.data as { status: TemplateInsightsStatus };
}

export async function enableTemplateInsights(phoneId: string) {
  const res = await axiosClient.post(`${ANALYTICS_URL}/enable`, { phoneId });
  return res.data as { status: TemplateInsightsStatus };
}

import type { RequestPayload } from "@/types/api.ts";
import type { WaAutomatedReply } from "@/types/global";
import { AutomationPlatform } from "@/types/platform.ts";

import { WHATSAPP_URL } from "..";
import { axiosClient } from "../../apiClient";

/** The chatbot platforms served by the Meta flow API (Instagram and Messenger). */
export type MetaAutomationPlatform = AutomationPlatform.INSTAGRAM | AutomationPlatform.FACEBOOK;

const BASE_PATHS: Record<MetaAutomationPlatform, string> = {
  [AutomationPlatform.INSTAGRAM]: `${WHATSAPP_URL}/instagram-automation`,
  [AutomationPlatform.FACEBOOK]: `${WHATSAPP_URL}/messenger-automation`,
};

// Transform platform from backend enum (uppercase) to frontend format (lowercase)
function transformAutomation(automation: WaAutomatedReply): WaAutomatedReply {
  return {
    ...automation,
    platform: automation.platform?.toLowerCase(),
  };
}

export async function createMetaAutomation(platform: MetaAutomationPlatform, data: RequestPayload) {
  const res = await axiosClient.post(BASE_PATHS[platform], data);
  const result = res.data as { success: boolean; data: WaAutomatedReply };
  return {
    ...result,
    data: transformAutomation(result.data),
  };
}

export async function getAllMetaAutomations(platform: MetaAutomationPlatform) {
  const res = await axiosClient.get(BASE_PATHS[platform]);
  const result = res.data as { success: boolean; data: WaAutomatedReply[] };
  return {
    ...result,
    data: result.data.map(transformAutomation),
  };
}

export async function getMetaAutomationById(
  platform: MetaAutomationPlatform,
  automationId: string,
) {
  const res = await axiosClient.get(`${BASE_PATHS[platform]}/${automationId}`);
  const result = res.data as { success: boolean; data: WaAutomatedReply };
  return {
    ...result,
    data: transformAutomation(result.data),
  };
}

export async function updateMetaAutomation(
  platform: MetaAutomationPlatform,
  automationId: string,
  data: RequestPayload,
) {
  const res = await axiosClient.put(`${BASE_PATHS[platform]}/${automationId}`, data);
  const result = res.data as { success: boolean; data: WaAutomatedReply };
  return {
    ...result,
    data: transformAutomation(result.data),
  };
}

export async function deleteMetaAutomation(platform: MetaAutomationPlatform, automationId: string) {
  const res = await axiosClient.delete(`${BASE_PATHS[platform]}/${automationId}`);
  return res.data as { success: boolean; message: string };
}

/** Copies a chatbot, graph and all, as a new one on the same platform. */
export async function cloneMetaAutomation(
  platform: MetaAutomationPlatform,
  automationId: string,
  name: string,
) {
  const res = await axiosClient.post(`${BASE_PATHS[platform]}/${automationId}/clone`, { name });
  const result = res.data as { success: boolean; data: WaAutomatedReply };
  return {
    ...result,
    data: transformAutomation(result.data),
  };
}

/**
 * Starts a chatbot for one person. `recipientId` is the igsId on Instagram and the psid
 * on Messenger; `accountId` is the Instagram business account or the Facebook Page.
 */
export async function initiateMetaAutomation(
  platform: MetaAutomationPlatform,
  automationId: string,
  recipientId: string,
  accountId: string,
) {
  const res = await axiosClient.post(`${BASE_PATHS[platform]}/${automationId}/initiate`, {
    recipientId,
    accountId,
  });
  return res.data as { success: boolean; message: string };
}

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

export async function getAllMetaAutomations(platform: MetaAutomationPlatform) {
  const res = await axiosClient.get(BASE_PATHS[platform]);
  const result = res.data as { success: boolean; data: WaAutomatedReply[] };
  return {
    ...result,
    data: result.data.map(transformAutomation),
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

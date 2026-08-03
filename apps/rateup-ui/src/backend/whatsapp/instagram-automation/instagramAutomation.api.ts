import type { RequestPayload } from "@/types/api.ts";
import type { WaAutomatedReply } from "@/types/global";

import { WHATSAPP_URL } from "..";
import { axiosClient } from "../../apiClient";

const base = `${WHATSAPP_URL}/instagram-automation`;

// Transform platform from backend enum (uppercase) to frontend format (lowercase)
function transformAutomation(automation: WaAutomatedReply): WaAutomatedReply {
  return {
    ...automation,
    platform: automation.platform?.toLowerCase(),
  };
}

export async function createInstagramAutomation(data: RequestPayload) {
  const res = await axiosClient.post(base, data);
  const result = res.data as { success: boolean; data: WaAutomatedReply };
  return {
    ...result,
    data: transformAutomation(result.data),
  };
}

export async function getAllInstagramAutomations() {
  const res = await axiosClient.get(`${base}`);
  const result = res.data as { success: boolean; data: WaAutomatedReply[] };
  return {
    ...result,
    data: result.data.map(transformAutomation),
  };
}

export async function getInstagramAutomationById(automationId: string) {
  const res = await axiosClient.get(`${base}/${automationId}`);
  const result = res.data as { success: boolean; data: WaAutomatedReply };
  return {
    ...result,
    data: transformAutomation(result.data),
  };
}

export async function updateInstagramAutomation(automationId: string, data: RequestPayload) {
  const res = await axiosClient.put(`${base}/${automationId}`, data);
  const result = res.data as { success: boolean; data: WaAutomatedReply };
  return {
    ...result,
    data: transformAutomation(result.data),
  };
}

export async function deleteInstagramAutomation(automationId: string) {
  const res = await axiosClient.delete(`${base}/${automationId}`);
  return res.data as { success: boolean; message: string };
}

export async function initiateInstagramAutomation(automationId: string, igsId: string) {
  const res = await axiosClient.post(`${base}/${automationId}/initiate`, {
    igsId,
  });
  return res.data as { success: boolean; message: string };
}

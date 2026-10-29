import type { RequestPayload } from "@/types/api.ts";
import type { WaAutomatedReply } from "@/types/global";

import { WHATSAPP_URL } from "..";
import { axiosClient } from "../../apiClient";

const base = `${WHATSAPP_URL}/automated-reply`;

// Transform platform from backend enum (uppercase) to frontend format (lowercase)
function transformAutomation(automation: WaAutomatedReply): WaAutomatedReply {
  return {
    ...automation,
    platform: automation.platform?.toLowerCase(),
  };
}

export async function createWaAutomatedReply(data: RequestPayload) {
  const res = await axiosClient.post(base, data);
  return transformAutomation(res.data as WaAutomatedReply);
}

export async function getAllWaAutomatedReplies() {
  const res = await axiosClient.get(`${base}`);
  const automations = res.data as WaAutomatedReply[];
  return automations.map(transformAutomation);
}

export async function getWaAutomatedRepliesById(waAutomatedReplyId: string) {
  const res = await axiosClient.get(`${base}/${waAutomatedReplyId}`);
  return transformAutomation(res.data as WaAutomatedReply);
}

export async function updateWaAutomatedReply(waAutomatedReplyId: string, data: RequestPayload) {
  const res = await axiosClient.put(`${base}/${waAutomatedReplyId}`, data);
  return transformAutomation(res.data as WaAutomatedReply);
}

export async function initiateWaAutomatedReply(id: string, phone: string) {
  const res = await axiosClient.post(`${base}/initiate/${id}`, { phone });
  return res.data;
}

import { WHATSAPP_URL } from "..";
import { WaAutomatedReply } from "../../../types/global";
import { axiosClient } from "../../apiClient";

const base = `${WHATSAPP_URL}/automated-reply`;

// Transform platform from backend enum (uppercase) to frontend format (lowercase)
function transformAutomation(automation: WaAutomatedReply): WaAutomatedReply {
  return {
    ...automation,
    platform: automation.platform?.toLowerCase() as any,
  };
}

export async function createWaAutomatedReply(data: any) {
  const res = await axiosClient.post(base, data);
  return transformAutomation(res.data as WaAutomatedReply);
}

export async function getAllWaAutomatedReplies() {
  const res = await axiosClient.get(`${base}`);
  const automations = res.data as WaAutomatedReply[];
  return automations.map(transformAutomation);
}

export async function getWaAutomatedRepliesByTeamId(teamId: string) {
  const res = await axiosClient.get(`${base}/team/${teamId}`);
  const automations = res.data as WaAutomatedReply[];
  return automations.map(transformAutomation);
}

export async function getWaAutomatedRepliesById(waAutomatedReplyId: string) {
  const res = await axiosClient.get(`${base}/${waAutomatedReplyId}`);
  return transformAutomation(res.data as WaAutomatedReply);
}

export async function updateWaAutomatedReply(
  waAutomatedReplyId: string,
  data: any,
) {
  const res = await axiosClient.put(`${base}/${waAutomatedReplyId}`, data);
  return transformAutomation(res.data as WaAutomatedReply);
}

export async function deleteWaAutomatedReply(waAutomatedReplyId: string) {
  const res = await axiosClient.delete(`${base}/${waAutomatedReplyId}`);
  return transformAutomation(res.data as WaAutomatedReply);
}

export async function getAutomatedRepliesMessageById(id: string) {
  const res = await axiosClient.get(`${base}/message/${id}`);
  return res.data;
}

export async function initiateWaAutomatedReply(id: string, phone: string) {
  const res = await axiosClient.post(`${base}/initiate/${id}`, { phone });
  return res.data;
}

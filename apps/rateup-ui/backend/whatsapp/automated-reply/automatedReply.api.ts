import { WHATSAPP_URL } from "..";
import { WaAutomatedReply } from "../../../types/global";
import { axiosClient } from "../../apiClient";

const base = `${WHATSAPP_URL}/automated-reply`;

export async function createWaAutomatedReply(data: any) {
  const res = await axiosClient.post(base, data);
  return res.data as WaAutomatedReply;
}

export async function getAllWaAutomatedReplies() {
  const res = await axiosClient.get(`${base}`);
  return res.data as WaAutomatedReply[];
}

export async function getWaAutomatedRepliesByTeamId(teamId: string) {
  const res = await axiosClient.get(`${base}/team/${teamId}`);
  return res.data as WaAutomatedReply[];
}
export async function getWaAutomatedRepliesById(waAutomatedReplyId: string) {
  const res = await axiosClient.get(`${base}/${waAutomatedReplyId}`);
  return res.data as WaAutomatedReply;
}

export async function updateWaAutomatedReply(
  waAutomatedReplyId: string,
  data: any,
) {
  const res = await axiosClient.put(`${base}/${waAutomatedReplyId}`, data);
  return res.data as WaAutomatedReply;
}

export async function deleteWaAutomatedReply(waAutomatedReplyId: string) {
  const res = await axiosClient.delete(`${base}/${waAutomatedReplyId}`);
  return res.data as WaAutomatedReply;
}

export async function getAutomatedRepliesMessageById(id: string) {
  const res = await axiosClient.get(`${base}/message/${id}`);
  return res.data;
}

export async function initiateWaAutomatedReply(id: string, phone: string) {
  const res = await axiosClient.post(`${base}/initiate/${id}`, { phone });
  return res.data;
}

import { WHATSAPP_URL } from "..";
import { CreateRule, Rule } from "../../../types/rule";
import { axiosClient } from "../../apiClient";

const base = `${WHATSAPP_URL}/automated-reply/rule`;

export async function createRule(data: CreateRule) {
  const res = await axiosClient.post(base, data);
  return res.data as Rule;
}

export async function getAllRules() {
  const res = await axiosClient.get(base);
  return res.data as Rule[];
}

export async function getRuleById(id: string) {
  const res = await axiosClient.get(`${base}/${id}`);
  return res.data as Rule;
}

export async function updateRule(id: string, data: Partial<CreateRule>) {
  const res = await axiosClient.put(`${base}/${id}`, data);
  return res.data as Rule;
}

export async function deleteRule(id: string) {
  const res = await axiosClient.delete(`${base}/${id}`);
  return res.data as Rule;
}

import { axiosClient } from "@/backend/apiClient";

import { WA_INBOX_BASE_PATH } from "../index.ts";

const BASE_URL = `${WA_INBOX_BASE_PATH}/automation`;

export interface InboxAutomationData {
  id: string;
  createdAt: string;
  closeAfterHours: number | null;
  active: boolean;
  action: "CLOSE" | null;
  condition: "UNASSIGNED" | "NEW" | "ASSIGNED" | null;
  orgId: string;
}

export async function enableInboxAutomation(
  condition: string,
): Promise<InboxAutomationData> {
  const res = await axiosClient.post(`${BASE_URL}/enable`, { condition });
  return res.data;
}

export async function getInboxAutomation(
  condition?: string,
): Promise<InboxAutomationData[]> {
  const params = condition ? { condition } : {};
  const res = await axiosClient.get(BASE_URL, { params });
  // Ensure we always return an array
  return Array.isArray(res.data) ? res.data : [res.data];
}

export async function updateInboxAutomation(
  condition: string,
  data: Partial<Omit<InboxAutomationData, "condition">>,
): Promise<InboxAutomationData> {
  const res = await axiosClient.put(BASE_URL, { condition, ...data });
  return res.data;
}

export async function deleteInboxAutomation(condition: string): Promise<any> {
  const res = await axiosClient.delete(BASE_URL, { params: { condition } });
  return res.data;
}

import type { RequestPayload } from "@/types/api.ts";

import { axiosClient } from "../apiClient";

const base = "/notification";

/** An in-app notification row. */
export interface AppNotification {
  id: string;
  source: string;
  subSource: string;
  createdAt: string;
  data?: {
    contactName?: string;
    contactId?: string;
    [key: string]: unknown;
  };
}

export async function getNotifications() {
  return (await axiosClient.get(base)).data;
}

export async function getNotificationsCount() {
  return (await axiosClient.get(`${base}/count`)).data;
}

export async function getNotificationSettings() {
  return (await axiosClient.get(`${base}/settings`)).data;
}

export async function updateNotificationSettings(data: RequestPayload) {
  return (await axiosClient.put(`${base}/settings`, data)).data;
}

export async function deleteNotification(notificationId: string) {
  return await axiosClient.delete(`${base}/${notificationId}`);
}

export async function deleteAllNotifications() {
  return await axiosClient.delete(`${base}`);
}

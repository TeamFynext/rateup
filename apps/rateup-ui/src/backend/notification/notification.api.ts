import { axiosClient } from "../apiClient";

const base = "/notification";

export const NOTIFICATION_CHANNELS = ["inApp", "push", "email", "desktop"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/** A bell row. `event` is null on rows written before the catalogue; `subSource` names those. */
export interface AppNotification {
  id: string;
  source: string;
  subSource: string;
  event: string | null;
  readAt: string | null;
  createdAt: string;
  data?: {
    contactName?: string;
    contactId?: string;
    /** App path the notification opens. Absent on rows written before the catalogue. */
    path?: string;
    /** Further per-event fields the message renderers read. */
    [key: string]: string | number | boolean | null | undefined;
  };
}

/** Mirrors `getNotificationSettings` in rateup-api. */
export interface NotificationSettings {
  channels: Record<NotificationChannel, boolean>;
  sound: boolean;
  /** Only the events this member may receive; `channels` holds only the ones each offers. */
  events: {
    key: string;
    category: string;
    channels: Partial<Record<NotificationChannel, boolean>>;
  }[];
}

export interface NotificationSettingsPatch {
  channels?: Partial<Record<NotificationChannel, boolean>>;
  sound?: boolean;
  events?: Record<string, Partial<Record<NotificationChannel, boolean>>>;
}

/** The `notification` websocket payload, sent to the member's own sockets only. */
export interface LiveNotification {
  id: string | null;
  event: string;
  data: AppNotification["data"];
  title: string;
  body: string;
  path: string;
  toast: boolean;
  desktop: boolean;
  sound: boolean;
  createdAt: string;
}

export async function getNotifications(): Promise<AppNotification[]> {
  return (await axiosClient.get(base)).data;
}

/** Unread rows only. */
export async function getNotificationsCount(): Promise<number> {
  return (await axiosClient.get(`${base}/count`)).data;
}

export async function markAllNotificationsRead() {
  await axiosClient.post(`${base}/read`);
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  return (await axiosClient.get(`${base}/settings`)).data;
}

export async function updateNotificationSettings(
  data: NotificationSettingsPatch,
): Promise<NotificationSettings> {
  return (await axiosClient.put(`${base}/settings`, data)).data;
}

export async function deleteNotification(notificationId: string) {
  return await axiosClient.delete(`${base}/${notificationId}`);
}

export async function deleteAllNotifications() {
  return await axiosClient.delete(`${base}`);
}

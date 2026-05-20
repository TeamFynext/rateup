import { axiosClient } from "../apiClient";

const base = "/notification";

export async function getNotifications() {
  return (await axiosClient.get(base)).data;
}

export async function getNotificationsCount() {
  return (await axiosClient.get(`${base}/count`)).data;
}

export async function getNotificationSettings() {
  return (await axiosClient.get(`${base}/settings`)).data;
}

export async function updateNotificationSettings(data) {
  return (await axiosClient.put(`${base}/settings`, data)).data;
}

export async function deleteNotification(notificationId) {
  return await axiosClient.delete(`${base}/${notificationId}`);
}

export async function deleteAllNotifications() {
  return await axiosClient.delete(`${base}`);
}

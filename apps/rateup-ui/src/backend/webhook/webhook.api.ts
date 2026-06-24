import { axiosClient } from "../apiClient";

const WEBHOOK_URL = "webhook";

export type WebhookEvent = "message_status";

type WebhookConfig = {
  id: string;
  url: string;
  events: WebhookEvent[];
  verifyToken?: string;
  createdAt: string;
  updatedAt: string;
};

export type SaveWebhookInput = {
  url: string;
  events: WebhookEvent[];
  verifyToken?: string;
};

/** Returns the org's single webhook config, or null if not set. */
export const getWebhook = async () => {
  const res = await axiosClient.get(WEBHOOK_URL);
  return res.data as WebhookConfig | null;
};

/** Create or replace the org's webhook (upsert). */
export const saveWebhook = async (data: SaveWebhookInput) => {
  const res = await axiosClient.post(WEBHOOK_URL, data);
  return res.data as WebhookConfig;
};

export const deleteWebhook = async () => {
  const res = await axiosClient.delete(WEBHOOK_URL);
  return res.data;
};

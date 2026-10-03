import { axiosClient } from "../apiClient";

const WEBHOOK_URL = "webhook";

/** Mirrors `WEBHOOK_EVENTS` in rateup-api's `webhook.schema.ts`. */
export const WEBHOOK_EVENTS = [
  "message_status",
  "message.received",
  "contact.created",
  "contact.updated",
  "contact.deleted",
  "contact.assigned",
  "contact.lifecycle_changed",
  "contact_group.members_added",
  "conversation.closed",
  "lead.created",
  "lead.stage_changed",
  "survey.response_submitted",
  "team.member_joined",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

interface WebhookConfig {
  id: string;
  url: string;
  events: WebhookEvent[];
  verifyToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveWebhookInput {
  url: string;
  events: WebhookEvent[];
  verifyToken?: string;
}

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

/** Changes what is sent; the endpoint stays put, so it is not challenged again. */
export const updateWebhookEvents = async (events: WebhookEvent[]) => {
  const res = await axiosClient.patch(`${WEBHOOK_URL}/events`, { events });
  return res.data as WebhookConfig;
};

export const deleteWebhook = async () => {
  const res = await axiosClient.delete(WEBHOOK_URL);
  return res.data;
};

/** The secret deliveries are signed with (`X-Rateup-Signature`). Needs `webhooks.manage`. */
export const getWebhookSecret = async () => {
  const res = await axiosClient.get(`${WEBHOOK_URL}/secret`);
  return res.data as { secret: string };
};

export const rotateWebhookSecret = async () => {
  const res = await axiosClient.post(`${WEBHOOK_URL}/secret/rotate`);
  return res.data as { secret: string };
};

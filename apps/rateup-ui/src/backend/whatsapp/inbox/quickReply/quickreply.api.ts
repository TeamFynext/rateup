import { axiosClient } from "@/backend/apiClient";
import type { RequestPayload } from "@/types/api.ts";

import { WA_INBOX_BASE_PATH } from "..";

const WA_QUICK_REPLY_BASE = `${WA_INBOX_BASE_PATH}/quick-reply`;

export async function getWaQuickReplies() {
  return (await axiosClient.get(WA_QUICK_REPLY_BASE)).data;
}

/**
 * The payload the quick-reply create endpoint accepts. `text` is the composer's editor
 * document — a tiptap `Content` value or plain text — which is serialised on the way out,
 * so this layer deliberately does not model the editor's own type.
 */
export interface CreateQuickReplyInput {
  text: unknown;
  key: string;
  category: string;
  topic: string;
}

export async function createWaQuickReply(data: CreateQuickReplyInput) {
  await axiosClient.post(WA_QUICK_REPLY_BASE, data);
}

/** A saved WhatsApp quick reply. */
export interface QuickReply {
  id: string;
  key: string;
  text: string;
  category: string;
  topic: string;
  message?: string;
  priority?: number;
}

export async function updateQuickReplyOrder(data: { id: string; priority: number }[]) {
  await axiosClient.put(`${WA_QUICK_REPLY_BASE}/order`, data);
}

export async function updateQuickReplyById({ id, data }: { id: string; data: RequestPayload }) {
  await axiosClient.put(`${WA_QUICK_REPLY_BASE}/${id}`, data);
}

export async function deleteQuickReplyById(id: string) {
  await axiosClient.delete(`${WA_QUICK_REPLY_BASE}/${id}`);
}

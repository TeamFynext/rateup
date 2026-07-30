import type z from "zod";

import { axiosClient } from "@/backend/apiClient";
import type { quickReplySchema } from "@/components/RichTextEditor/WaQuickReply/WaQuickReplySettings.tsx";
import type { RequestPayload } from "@/types/api.ts";

import { WA_INBOX_BASE_PATH } from "..";

const WA_QUICK_REPLY_BASE = `${WA_INBOX_BASE_PATH}/quick-reply`;

export async function getWaQuickReplies() {
  return (await axiosClient.get(WA_QUICK_REPLY_BASE)).data;
}

export async function createWaQuickReply(data: z.infer<typeof quickReplySchema>) {
  await axiosClient.post(WA_QUICK_REPLY_BASE, data);
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

import { axiosClient } from "@/backend/apiClient";
import type { RequestPayload } from "@/types/api.ts";

import { LOYALTY_BASE } from "../base.ts";

const base = LOYALTY_BASE + "/settings";

export async function createLoyaltyTemplate(data: RequestPayload) {
  await axiosClient.post(`${base}/template`, data);
}

export async function updateLoyaltyTemplate(id: string, data: RequestPayload) {
  await axiosClient.put(`${base}/template/${id}`, data);
}

export async function deleteLoyaltyTemplate(id: string) {
  await axiosClient.delete(`${base}/template/${id}`);
}

export async function getLoyaltyTemplate(id: string) {
  return (await axiosClient.get(`${base}/template/${id}`)).data;
}

/** An inbound keyword and the reply it gets — `LoyaltyWaCommand` on the API. */
export interface LoyaltyWaCommand {
  id: string;
  orgId: string;
  type: string;
  requestMessage: string | null;
  /** Rich-text document (the editor's JSON); plain text when written by the wizard. */
  content: unknown;
  responseType: "Text" | "Template" | string;
  waTemplateId: string | null;
  whatsappSettingsPhoneId?: string | null;
}

export async function getAllLoyaltyTemplates(): Promise<LoyaltyWaCommand[]> {
  return (await axiosClient.get(`${base}/template/all`)).data;
}

import type { RequestPayload } from "@/types/api.ts";
import type { WaAutomatedReply } from "@/types/global";
import type { AutomationPlatform } from "@/types/platform.ts";

import { axiosClient } from "../apiClient";

/**
 * `/api/chatbots`: chatbots on every channel through one API. The older per-channel clients
 * (`automatedReply.api.ts`, `instagramAutomation.api.ts`) stay for the rules picker, the
 * inbox and loyalty.
 */
const base = "/chatbots";

/** How the API names a channel; the UI keeps the lowercase AutomationPlatform values. */
export type ChatbotApiPlatform = "WHATSAPP" | "INSTAGRAM" | "FACEBOOK";

/** Why a channel's chatbots were left out of the list. */
export type ChatbotChannelLock = "no_subscription" | "subscription_expired" | "not_in_plan";

/** One card's worth of a chatbot; the graph is only sent by `getChatbot`. */
export interface ChatbotSummary {
  id: string;
  name: string;
  /** Lowercased, as AutomationPlatform. */
  platform: AutomationPlatform;
  createdAt: string;
  /** Last edit. */
  updatedAt: string;
  /** Off: rules and lead ads don't start it; the inbox still can. */
  isActive: boolean;
  stepCount: number;
  whatsappSettingsPhoneId: string | null;
  /** Conversations it has started, and how many reached the end. */
  runs: { started: number; completed: number };
}

export interface ChatbotList {
  data: ChatbotSummary[];
  locked: Partial<Record<ChatbotApiPlatform, ChatbotChannelLock>>;
}

function lower<T extends { platform?: string | null }>(row: T): T {
  return { ...row, platform: row.platform?.toLowerCase() };
}

export async function getChatbots(platform?: AutomationPlatform): Promise<ChatbotList> {
  const res = await axiosClient.get(base, { params: platform ? { platform } : undefined });
  const body = res.data as ChatbotList;
  return { data: body.data.map(lower), locked: body.locked ?? {} };
}

export async function getChatbot(id: string): Promise<WaAutomatedReply> {
  const res = await axiosClient.get(`${base}/${id}`);
  return lower((res.data as { data: WaAutomatedReply }).data);
}

/** Why the wizard's start rule was not made: not needed (a lead ad), no account, or an error. */
export type StartRuleSkip = "not_needed" | "no_account" | "failed";

export interface CreatedChatbot {
  chatbot: WaAutomatedReply;
  /** Present when the request asked for a start rule. The rule is made switched off. */
  startRule?: {
    rule: { id: string; name: string; isActive: boolean } | null;
    skipped?: StartRuleSkip;
  };
}

export async function createChatbot(data: RequestPayload): Promise<CreatedChatbot> {
  const res = await axiosClient.post(base, data);
  const body = res.data as { data: WaAutomatedReply; startRule?: CreatedChatbot["startRule"] };
  return { chatbot: lower(body.data), startRule: body.startRule };
}

/** A rule that starts a chatbot, as the editor needs it. */
export interface ChatbotRule {
  id: string;
  name: string;
  isActive: boolean;
  triggerEvent: string;
  accountIds: string[];
  /** The rule's message keywords; "" for one not filled in yet. */
  keywords: string[];
}

export async function getChatbotRules(id: string): Promise<ChatbotRule[]> {
  const res = await axiosClient.get(`${base}/${id}/rules`);
  return (res.data as { data: ChatbotRule[] }).data;
}

export async function updateChatbot(id: string, data: RequestPayload): Promise<WaAutomatedReply> {
  const res = await axiosClient.put(`${base}/${id}`, data);
  return lower((res.data as { data: WaAutomatedReply }).data);
}

export async function cloneChatbot(id: string, name: string): Promise<WaAutomatedReply> {
  const res = await axiosClient.post(`${base}/${id}/clone`, { name });
  return lower((res.data as { data: WaAutomatedReply }).data);
}

export async function deleteChatbot(id: string): Promise<void> {
  await axiosClient.delete(`${base}/${id}`);
}

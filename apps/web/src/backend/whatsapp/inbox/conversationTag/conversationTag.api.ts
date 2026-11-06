import { axiosClient } from "@/backend/apiClient";

const CONVERSATION_TAG_BASE_URL = "/contact/conversation-tags";

/**
 * A conversation tag as the API returns it.
 *
 * Tags are **ticket-grained**: they describe one conversation and are picked per
 * ticket. Contact labels (`ContactLabelOption`) are the customer-grained
 * counterpart and follow a contact across every ticket they open.
 */
export interface ConversationTagOption {
  id: string;
  name: string;
  color?: string | null;
  description?: string | null;
  createdAt?: string;
  orgId?: string;
  /** Conversations currently carrying the tag; only the list endpoint sets it. */
  conversationCount?: number;
}

export interface CreateConversationTagPayload {
  name: string;
  color?: string;
  description?: string;
}

export type UpdateConversationTagPayload = Partial<CreateConversationTagPayload>;

export const getConversationTags = async () => {
  const res = await axiosClient.get<ConversationTagOption[]>(CONVERSATION_TAG_BASE_URL);
  return res.data;
};

export const createConversationTag = async (data: CreateConversationTagPayload) => {
  const res = await axiosClient.post<ConversationTagOption>(CONVERSATION_TAG_BASE_URL, data);
  return res.data;
};

export const updateConversationTag = async (tagId: string, data: UpdateConversationTagPayload) => {
  const res = await axiosClient.put<ConversationTagOption>(
    `${CONVERSATION_TAG_BASE_URL}/${tagId}`,
    data,
  );
  return res.data;
};

export const deleteConversationTag = async (tagId: string) => {
  const res = await axiosClient.delete(`${CONVERSATION_TAG_BASE_URL}/${tagId}`);
  return res.data;
};

/** Replaces the conversation's whole tag set and returns what it ended up with. */
export const assignTagsToConversation = async (conversationId: string, tagIds: string[]) => {
  const res = await axiosClient.put<ConversationTagOption[]>(
    `${CONVERSATION_TAG_BASE_URL}/by-conversation/${conversationId}`,
    { tagIds },
  );
  return res.data;
};

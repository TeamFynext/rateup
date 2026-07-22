import type { MessagePlatform } from "@/types/enums.ts";
import type { WaInboxMessage, WaTemplateComponent } from "@/types/global";

import { WA_INBOX_BASE_PATH } from "..";
import { axiosClient } from "../../../apiClient";

const WA_CONTACT_BASE_PATH = `${WA_INBOX_BASE_PATH}/message`;

export interface WaGetMessagesBody {
  id: string;
  waContctId: string;
  createdAt: string;
  waCreatedAt: string;
  messageBody: WaInboxMessage;
  templateComponentParams: WaTemplateComponent[];
  stats?: { read: string; delivered: string; sent: string; failed: string };
  sender?: {
    name?: string;
    profilePhoto?: string;
  };
  messageId?: string;
  readUsers?: string[];
  reactionMessage?: {
    id: string;
    messageBody: any;
    createdAt: string;
    sender?: {
      name?: string;
      profilePhoto?: string;
    };
  };
  sourcePlatform: MessagePlatform;
  sourceIdentifier: string;
  // The ticket a message belongs to. Nullable for legacy messages that predate
  // the conversation backfill.
  conversationId?: string | null;
}

interface WaMessagePage {
  messages: WaGetMessagesBody[];
  nextCursor: string;
  hasNextPage: boolean;
}

export async function getMessagesByContactId(
  contactId: string,
  cursor: string,
  selectedPhone: string,
  conversationId?: string | null,
) {
  const params = new URLSearchParams({ cursor, phone: selectedPhone });
  if (conversationId) params.set("conversationId", conversationId);
  return (await axiosClient.get(`${WA_CONTACT_BASE_PATH}/${contactId}?${params.toString()}`))
    .data as WaMessagePage;
}

export async function sendNewWaMessage(contactId: string, message: any) {
  return await axiosClient.post(`${WA_CONTACT_BASE_PATH}/${contactId}`, message);
}

/** Close-with-result taxonomy — mirrors the API's `ResolutionResult` enum. */
export type ResolutionResult = "RESOLVED" | "ANSWERED" | "NO_RESPONSE" | "DUPLICATE";

/**
 * Inbox Tickets v2 — a row is a *ticket* (one Conversation), not a contact.
 * A contact with three tickets produces three rows sharing one `id` (the contact
 * id) but distinct `conversationId`s, so `conversationId` is the row identity.
 * Use `getRowKey` rather than `.id` anywhere a list key is needed.
 */
export type ContactsWithLastMessage = ContactsData & {
  groups?: string[];
  lastMessage: {
    waCreatedAt: string;
    messageBody: WaInboxMessage;
    sourcePlatform: MessagePlatform;
    sourceIdentifier: string;
  };
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  lastReceivedMessageTimeStamp: string;
  total_contact_count?: string;
  unReadMessageCount?: number;
  assignedUsers: { id: string; name: string; teamId: string }[];
  messages: Partial<WaGetMessagesBody>[];

  // ---- Ticket identity (from Conversation) ----
  conversationId?: string | null;
  ticketNumber?: number | null;
  ticketSubject?: string | null;
  ticketDescription?: string | null;
  resolutionResult?: ResolutionResult | null;
  /** The ticket's own status. Prefer this over the contact-level `waMessageAssignStatus`. */
  conversationStatus?: string | null;
  ticketCreatedAt?: string | null;
  ticketClosedAt?: string | null;
  ticketReopenCount?: number | null;
  conversationLastMessageAt?: string | null;
  conversationLastCustomerMessageAt?: string | null;

  // ---- Inbox signals ----
  isFavorite?: boolean;
  /** Unseen @mentions for the current user on this ticket. */
  mentionCount?: number;
  /** Sibling tickets for the same contact — drives the thread's history strip. */
  otherTicketCount?: number;
  contactLabels?: { id: string; name: string; color: string }[];
};

/**
 * Stable list key for a ticket row. Falls back to the contact id for rows that
 * somehow arrive without a conversation (an empty inbox contact).
 */
export function getRowKey(row: { id: string; conversationId?: string | null }): string {
  return row.conversationId ?? row.id;
}
interface ContactsWithLastMessageResponse {
  rows: ContactsWithLastMessage[];
  nextOffset: number | null;
}

export async function getFilteredContacts(filterData: string, page: number) {
  return (
    await axiosClient.get(
      `${WA_CONTACT_BASE_PATH}/contactsfiltered?filterData=${filterData}&page=${page}`,
      {
        timeout: 16000,
      },
    )
  ).data as ContactsWithLastMessageResponse;
}
interface assignedTo {
  name: string;
  recipeName: string | null;
  phone: string | null;
}
interface comments {
  id: string;
  text: string;
  createdById: string;
  createdAt: string;
  ticketId: string;
}
export interface _tickets {
  id: string;
  number: number;
  title: string;
  description: string;
  type: string;
  createdById: string;
  createdAt: string;
  status: string;
  priority: string;
  teamId: string;
  deadline: string | null;
  assignedToId: string;
  reviewId: string | null;
  surveyResponseId: string;
  comments: comments[];
  assignedTo: assignedTo;
}

export async function exportWaChats({
  constraints,
  filterData,
}: {
  constraints: string;
  filterData: string;
}) {
  return (
    await axiosClient.post(
      `${WA_CONTACT_BASE_PATH}/exportmessages?constraints=${constraints}&filterData=${filterData}`,
      {},
      { responseType: "arraybuffer", timeout: 0 },
    )
  ).data;
}

export async function getWaChatMediaFile(mediaId: string) {
  try {
    const response = await axiosClient.get(`${WA_CONTACT_BASE_PATH}/mediafile/${mediaId}`, {
      responseType: "arraybuffer", // Ensure the response is returned as raw binary data
    });

    // Convert the binary data to a Blob and return it
    return new Blob([response.data]);
  } catch (error) {
    console.error("Error fetching media file:", error);
    throw error;
  }
}

/**
 * Assigning a contact whose last ticket is closed does not revive that ticket —
 * the API opens a successor and assigns that instead — so the response names the
 * ticket the assignment landed on.
 */
export interface AssignInboxResult {
  assignees: { userId: string; teamId: string }[];
  conversation: { id: string; number: number | null; status: string } | null;
}

export async function assignInboxToUser(data: {
  contactId: string;
  assignees: { userId: string; teamId: string }[];
  messageId: string; // for internal message
}): Promise<AssignInboxResult> {
  return (await axiosClient.post(`${WA_CONTACT_BASE_PATH}/assign`, data)).data;
}

/**
 * Reopen a closed ticket. The API opens the successor ticket and carries the
 * closed ticket's assignees onto it, so the result has the same shape as an
 * assignment — it *is* one.
 */
export async function reopenConversation(data: {
  contactId: string;
  conversationId?: string;
  messageId?: string;
}): Promise<AssignInboxResult> {
  return (
    await axiosClient.post(`${WA_CONTACT_BASE_PATH}/reopen/${data.contactId}`, {
      conversationId: data.conversationId,
      messageId: data.messageId,
    })
  ).data;
}

export async function bulkAssignInboxToUser(data: {
  contactIds: string[];
  assignee: { userId: string; teamId: string };
}) {
  return (await axiosClient.post(`${WA_CONTACT_BASE_PATH}/assign-bulk`, data)).data;
}

export async function getAssignedUserForContact(contactId) {
  return (await axiosClient.get(`${WA_CONTACT_BASE_PATH}/assign/${contactId}`)).data;
}

export async function getInboxUserCount() {
  return (await axiosClient.get(`${WA_CONTACT_BASE_PATH}/count`, { timeout: 30000 })).data;
}

export async function markWaMessagesAsRead(contactId) {
  return (await axiosClient.post(`${WA_CONTACT_BASE_PATH}/mark/${contactId}`)).data;
}

/**
 * Inbox Tickets v2 — set (not toggle) the favourite/star flag. The flag lives on
 * the conversation (ticket), so each of a contact's tickets stars independently.
 */
export async function setConversationFavorite(data: {
  conversationId: string;
  isFavorite: boolean;
}) {
  return (await axiosClient.post(`${WA_CONTACT_BASE_PATH}/favorite`, data)).data as {
    success: boolean;
    isFavorite: boolean;
  };
}

/**
 * Inbox Tickets v2 — explicitly clear the current user's unseen @mentions on a
 * conversation (the "clear mention" action). `conversationId` scopes it to one
 * ticket; omit it to clear every mention on the contact.
 */
export async function clearConversationMentions(data: {
  contactId: string;
  conversationId?: string | null;
}) {
  return (
    await axiosClient.post(`${WA_CONTACT_BASE_PATH}/mentions/clear/${data.contactId}`, {
      conversationId: data.conversationId ?? undefined,
    })
  ).data as { success: boolean };
}

/**
 * Inbox Tickets v2 — edit a ticket's title/description.
 *
 * Only these fields are sent: the endpoint's date fields are `z.date()` and reject
 * JSON date strings, and writing `status` here bypasses the contact/conversation
 * status mirror. Status changes go through the contact endpoints instead.
 */
export async function updateConversation(
  conversationId: string,
  data: { subject?: string | null; description?: string | null },
) {
  // NB: axiosClient's baseURL already ends in `/api` — paths must not repeat it.
  return (await axiosClient.put(`/contact/conversations/${conversationId}`, data)).data;
}

/**
 * Inbox Tickets v2 — one conversation of a contact, as returned by
 * `GET /api/contact/conversations/by-contact/:contactId`.
 *
 * This is NOT an inbox row: it carries only ticket-level fields, so it must be
 * merged onto a real contact before it can be handed to `setSelectedContact`.
 */
export interface ContactConversation {
  id: string;
  number: number | null;
  subject: string | null;
  description: string | null;
  status: string;
  resolutionResult: ResolutionResult | null;
  createdAt: string;
  closedAt: string | null;
  lastMessageAt: string | null;
  messageCount: number;
  assignedUsers: { userId: string; teamId: string; user: { name: string } }[];
}

/** Every conversation for a contact, newest first, org-scoped by the API. */
export async function getConversationsByContactId(contactId: string) {
  // NB: axiosClient's baseURL already ends in `/api` — paths must not repeat it.
  return (await axiosClient.get(`/contact/conversations/by-contact/${contactId}`))
    .data as ContactConversation[];
}

export async function blockWhatsAppUser(data: { phoneNumbersList: string[] }) {
  return (await axiosClient.post(`${WA_CONTACT_BASE_PATH}/block-user`, data)).data;
}

export async function unblockWhatsAppUser(data: { phoneNumbersList: string[] }) {
  return (await axiosClient.post(`${WA_CONTACT_BASE_PATH}/unblock-user`, data)).data;
}

export async function getInboxAnalytics() {
  return (await axiosClient.get(`${WA_CONTACT_BASE_PATH}/analytics`)).data;
}

export async function generateInboxResponse(data) {
  return (await axiosClient.post(`${WA_CONTACT_BASE_PATH}/generate-response`, data)).data;
}

export async function createPrivateMessage(contactId, data) {
  return (await axiosClient.post(`${WA_CONTACT_BASE_PATH}/privatemessage/${contactId}`, data)).data;
}

export async function getWaMessageLogs(filter) {
  // Format date range if it's an array of Date objects
  let dateRange = filter.dateRange;
  if (Array.isArray(dateRange) && dateRange.length === 2) {
    dateRange = `${dateRange[0]},${dateRange[1]}`;
  }

  // Build params object
  const params = {
    dateKey: filter.dateKey,
    dateRange,
    status: filter.status,
    source: filter.source,
    team: filter.team,
    searchQuery: filter.searchQuery,
    ...(filter.pagination && {
      pageIndex: filter.pagination.pageIndex,
      pageSize: filter.pagination.pageSize,
    }),
  };

  // Add pagination if provided
  if (filter.pagination) {
    params.pageIndex = filter.pagination.pageIndex;
    params.pageSize = filter.pagination.pageSize;
  }

  // Filter out undefined/null values
  const filteredParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v != null));

  return (
    await axiosClient.get(`${WA_CONTACT_BASE_PATH}/message-logs`, {
      params: filteredParams,
      timeout: 60000,
    })
  ).data;
}

export async function exportWaMessageLogs(filter) {
  let dateRange = filter.dateRange;
  if (Array.isArray(dateRange) && dateRange.length === 2) {
    dateRange = `${dateRange[0]},${dateRange[1]}`;
  }

  const params = {
    dateKey: filter.dateKey,
    dateRange,
    status: filter.status,
    source: filter.source,
    team: filter.team,
    searchQuery: filter.searchQuery,
  };

  const filteredParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v != null));

  return (
    await axiosClient.get(`${WA_CONTACT_BASE_PATH}/export-message-logs`, {
      params: filteredParams,
      responseType: "arraybuffer",
      timeout: 120000,
    })
  ).data;
}

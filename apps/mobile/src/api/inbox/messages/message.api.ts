import axios from "@/config/axios";

/**
 * One page of a chat, newest first. With `conversationId` the API returns that
 * ticket's messages only (plus history recorded before tickets existed), as
 * rateup-ui does; without one, every message of the contact on every channel.
 */
export async function getMessagesByContactId(
  contactId: string,
  cursor: string,
  conversationId?: string | null,
) {
  const res = await axios.get(`/api/wa/inbox/message/${contactId}`, {
    params: { cursor, ...(conversationId ? { conversationId } : {}) },
  });
  return res.data;
}

export async function sendNewWaMessage(contactId: string, message: any) {
  return await axios.post(`/api/wa/inbox/message/${contactId}`, message);
}

export async function getWaChatMediaFile(mediaId: string) {
  const response = await axios.get(`/api/wa/inbox/message/mediafile/${mediaId}`, {
    responseType: "arraybuffer",
  });
  return response.data;
}

export async function assignInboxToUser(data: {
  contactId: string;
  assignees: { userId: string; teamId: string }[];
  messageId: string; // for internal message
}): Promise<{ id: string; name: string }[]> {
  return (await axios.post(`/api/wa/inbox/message/assign`, data)).data;
}

/**
 * Set a chat's single owner. `userId` names them; `teamId` alone lets the API pick
 * one member of that team in turn; neither unassigns. The API picks the team a
 * named person is recorded under. Mirrors `assignOwner` in rateup-ui.
 */
export async function assignOwner(data: {
  contactId: string;
  userId?: string | null;
  teamId?: string | null;
  messageId: string;
}): Promise<{ assignees: { userId: string; teamId: string }[] }> {
  return (await axios.post(`/api/wa/inbox/message/assign/owner`, data)).data;
}

/** One `assignee` for every chat, or a `teamId` whose members take the chats in turn. */
export async function bulkAssign(
  data: { contactIds: string[] } & (
    | { assignee: { userId: string; teamId: string } }
    | { teamId: string }
  ),
): Promise<{
  assignedCount: number;
  failedCount: number;
  results: {
    contactId: string;
    success: boolean;
    result?: { assignees: { userId: string; teamId: string }[] };
  }[];
}> {
  return (await axios.post(`/api/wa/inbox/message/assign-bulk`, data)).data;
}

export async function getAssignedUserForContact(contactId: any) {
  return (await axios.get(`/api/wa/inbox/message/assign/${contactId}`)).data;
}

export async function createPrivateMessage(contactId: string, data: any) {
  return (await axios.post(`/api/wa/inbox/message/privatemessage/${contactId}`, data)).data;
}

export type InstagramModerationAction = "block" | "unblock" | "spam";

/** Block, unblock or move to spam on Instagram itself; "spam" also marks the contact spam. */
export async function moderateInstagramContact(
  contactId: string,
  action: InstagramModerationAction,
): Promise<{ igBlockedAt: string | null; isSpam: boolean }> {
  return (await axios.post(`/api/wa/inbox/message/${contactId}/instagram/${action}`)).data;
}

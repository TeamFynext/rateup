import axios from "@/config/axios";

/**
 * Ticket management: the same endpoints the web inbox's ticket panel and close menu use.
 *
 * A list row is a ticket. Calls about the ticket take its `conversationId` (tags, title,
 * delete); calls about the customer take the contact's id (labels, spam, block, lead
 * stage); reopen, close and clear-mention take the contact id with the ticket in the body.
 */

export type TagOption = { id: string; name: string; color?: string | null };

// ---------- Conversation tags (per ticket) ----------

export async function getConversationTags(): Promise<TagOption[]> {
  return (await axios.get(`/api/inbox/conversation-tags`)).data;
}

/** Replaces the ticket's tags with `tagIds`; returns the tags it now has. */
export async function setConversationTags(conversationId: string, tagIds: string[]) {
  const res = await axios.put(`/api/inbox/conversation-tags/by-conversation/${conversationId}`, {
    tagIds,
  });
  return res.data as TagOption[];
}

// ---------- Contact labels (per customer) ----------

/** Replaces the contact's labels with `labelIds`. */
export async function setContactLabels(contactId: string, labelIds: string[]) {
  return (await axios.put(`/api/contacts/labels/assign/${contactId}`, { labelIds })).data;
}

// ---------- Ticket state ----------

export type ReopenResult = {
  assignees: { userId: string; teamId: string }[];
  /** The successor ticket the server opened: a closed ticket is never revived. */
  conversation: { id: string; number: number; status: string } | null;
};

export async function reopenTicket(
  contactId: string,
  body: { conversationId?: string | null; messageId?: string },
): Promise<ReopenResult> {
  return (await axios.post(`/api/inbox/message/reopen/${contactId}`, body)).data;
}

/** Marks or clears spam for the contact. Marking also closes every open ticket. */
export async function setContactSpam(body: {
  contactId: string;
  isSpam: boolean;
  messageId?: string;
}): Promise<{ success: boolean; isSpam: boolean }> {
  return (await axios.post(`/api/inbox/message/spam`, body)).data;
}

/** Blocks or unblocks numbers on WhatsApp (the org's default WhatsApp number). */
export async function setWhatsAppBlocked(phoneNumbersList: string[], blocked: boolean) {
  const path = blocked ? "block-user" : "unblock-user";
  return (await axios.post(`/api/inbox/message/${path}`, { phoneNumbersList })).data;
}

/** Clears this user's unseen @mentions on the ticket. */
export async function clearMentions(contactId: string, conversationId?: string | null) {
  return (
    await axios.post(
      `/api/inbox/message/mentions/clear/${contactId}`,
      conversationId ? { conversationId } : {},
    )
  ).data;
}

// ---------- The contact's tickets ----------

export type ContactConversation = {
  id: string;
  number: number;
  subject: string | null;
  description: string | null;
  status: string;
  resolutionResult: string | null;
  createdAt: string;
  closedAt: string | null;
  lastMessageAt: string | null;
  messageCount: number;
  assignedUsers: { userId: string; teamId: string; user?: { name?: string } }[];
};

export async function getContactConversations(contactId: string): Promise<ContactConversation[]> {
  return (await axios.get(`/api/inbox/conversations/by-contact/${contactId}`)).data;
}

export async function updateConversation(
  conversationId: string,
  body: { subject: string | null; description: string | null },
) {
  return (await axios.put(`/api/inbox/conversations/${conversationId}`, body)).data;
}

export async function deleteConversation(conversationId: string) {
  return (await axios.delete(`/api/inbox/conversations/${conversationId}`)).data;
}

// ---------- Ad referrals ----------

export type AdReferral = {
  id: string;
  conversationId: string | null;
  sourceId: string;
  sourceType: string;
  sourceUrl: string | null;
  headline: string | null;
  body: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  createdAt: string;
};

export async function getAdReferrals(contactId: string): Promise<AdReferral[]> {
  return (await axios.get(`/api/inbox/ad-referrals/${contactId}`)).data;
}

// ---------- Lead stage (pipelines) ----------

export type PipelineSummary = { id: string; name: string; type: string };
export type PipelineStage = {
  id: string;
  name: string;
  color?: string | null;
  order: number;
  status?: "OPEN" | "WON" | "LOST";
};
export type ContactStage = {
  pipelineId: string;
  leadId: string | null;
  stageId: string | null;
  loss: { notes: number; tasks: number; activities: number; assignees: number } | null;
} | null;

export async function getPipelines(): Promise<PipelineSummary[]> {
  return (await axios.get(`/api/pipelines`)).data;
}

export async function getPipelineStages(pipelineId: string): Promise<PipelineStage[]> {
  const data = (await axios.get(`/api/pipelines/${pipelineId}`)).data;
  return [...(data?.stages ?? [])].sort((a, b) => a.order - b.order);
}

export async function getContactStage(contactId: string): Promise<ContactStage> {
  return (await axios.get(`/api/pipelines/leads/contact/${contactId}/stage`)).data;
}

export async function setContactStage(contactId: string, stageId: string) {
  return (await axios.put(`/api/pipelines/leads/contact/${contactId}/stage`, { stageId })).data;
}

/** Takes the contact off the board: deletes the lead with its notes and tasks. */
export async function removeContactFromBoard(contactId: string) {
  return (await axios.delete(`/api/pipelines/leads/contact/${contactId}/stage`)).data;
}

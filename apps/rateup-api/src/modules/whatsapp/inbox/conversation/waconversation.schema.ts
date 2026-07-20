import { z } from "zod";

export const byConversationIdSchema = z.object({
  conversationId: z.uuid(),
});
export type ByConversationIdParams = z.infer<typeof byConversationIdSchema>;

/// The inbox tabs of the session-centric UI. "New" is UNASSIGNED + not yet
/// replied to; "Closed" lists every past session (one row per conversation).
export const conversationTabSchema = z.enum([
  "all",
  "open",
  "New",
  "UnAssigned",
  "Assigned",
  "mine",
  "Closed",
]);
export type ConversationTab = z.infer<typeof conversationTabSchema>;

export const conversationFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  tab: conversationTabSchema.default("open"),
  /// Optional narrowing of the Closed tab to specific terminal statuses.
  status: z.array(z.string()).default([]),
  searchTerm: z.string().optional(),
  labels: z.array(z.uuid()).optional(),
  lifecycle: z.uuid().optional(),
  /// Channel filter: a WhatsApp number / account source identifier. Matches
  /// conversations that have a message on that channel. "all"/empty = no filter.
  channel: z.string().optional(),
  blockedUsers: z.boolean().default(false),
  assignedTeams: z.array(z.uuid()).optional(),
  assignedUserIds: z.array(z.uuid()).optional(),
  sortBy: z.enum(["newest", "oldest"]).default("newest"),
});
export type ConversationFilterSchema = z.infer<typeof conversationFilterSchema>;

export const conversationMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
});

export const closeConversationBodySchema = z.object({
  /// Terminal status to close with.
  status: z.enum(["CLOSED", "SPAM", "RESOLVED", "UNRESOLVED"]).default("CLOSED"),
  /// Client-generated id for the internal close-marker message.
  messageId: z.string().optional(),
});
export type CloseConversationBody = z.infer<typeof closeConversationBodySchema>;

export const reopenConversationBodySchema = z.object({
  /// Carry the closed session's assignees into the new one.
  copyAssignees: z.boolean().default(false),
  messageId: z.string().optional(),
});
export type ReopenConversationBody = z.infer<typeof reopenConversationBodySchema>;

export const assignConversationBodySchema = z.object({
  assignees: z.array(z.object({ userId: z.uuid(), teamId: z.uuid() })),
  assignIfOnline: z.boolean().default(false),
  messageId: z.string().optional(),
});
export type AssignConversationBody = z.infer<typeof assignConversationBodySchema>;

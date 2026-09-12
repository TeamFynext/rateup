import z from "zod";
import { CloseReason, ResolutionResult, WaMessageAssignStatus } from "../../../types/enums.js";

const inboxStatusSchema = z.enum(WaMessageAssignStatus);
const closeReasonSchema = z.enum(CloseReason);
const resolutionResultSchema = z.enum(ResolutionResult);

const conversationCoreSchema = z.object({
  contactId: z.uuid(),
  orgId: z.uuid(),
  status: inboxStatusSchema.optional(),
});

const updateConversationSchema = z.object({
  status: inboxStatusSchema.optional(),
  firstRespondedAt: z.date().optional(),
  assignedAt: z.date().optional(),
  closedAt: z.date().optional(),
  closedBy: z.uuid().optional(),
  firstRespondedByUserAt: z.date().optional(),
  resolvedAt: z.date().optional(),
  closeReason: closeReasonSchema.optional(),
  closedByAutomation: z.boolean().optional(),
  // Inbox Tickets v2: editable ticket fields + resolution taxonomy.
  subject: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  resolutionResult: resolutionResultSchema.optional().nullable(),
});

/// Who caused a status transition. `closedBy` is only ever populated from a real
/// `userId`; automation and rule closes intentionally leave it null.
const inboxActorSchema = z.object({
  userId: z.uuid().optional(),
  source: z.enum(["user", "automation", "rule", "system"]),
});

const conversationAssigneeUpdateSchema = z.object({
  assignees: z
    .array(
      z.object({
        userId: z.uuid(),
        teamId: z.uuid().optional(),
      }),
    )
    .optional(),
  assignedAt: z.date().optional(),
  removedAt: z.date().optional(),
  assignedBy: z.uuid().optional(),
  removedBy: z.uuid().optional(),
});

const conversationParamsSchema = z.object({
  conversationId: z.uuid(),
});

/**
 * Inbox Tickets v2 — the list's bulk delete.
 *
 * Capped so one request cannot be asked to delete an unbounded number of threads
 * (and their messages) inside a single transaction; the list selects a page at a
 * time, well under this.
 */
const deleteConversationsSchema = z.object({
  conversationIds: z.array(z.uuid()).min(1).max(200),
});

/** Inbox Tickets v2 — params for a contact's ticket history. */
const contactConversationsParamsSchema = z.object({
  contactId: z.uuid(),
});

const statsQuerySchema = z.object({
  dateKey: z.string().optional(),
  dateRange: z.string().optional(),
  days: z.coerce.number().optional(),
});

const staffIdParamsSchema = z.object({
  staffId: z.string(),
});

const teamIdParamsSchema = z.object({
  teamId: z.string(),
});

export type ConversationCore = z.infer<typeof conversationCoreSchema>;
export type UpdateConversationSchema = z.infer<typeof updateConversationSchema>;
export type InboxActor = z.infer<typeof inboxActorSchema>;
export type ConversationParamsSchema = z.infer<typeof conversationParamsSchema>;
export type DeleteConversationsSchema = z.infer<typeof deleteConversationsSchema>;
export type ContactConversationsParamsSchema = z.infer<typeof contactConversationsParamsSchema>;
export type ConversationAssigneeUpdateSchema = z.infer<typeof conversationAssigneeUpdateSchema>;
export type StatsQuerySchema = z.infer<typeof statsQuerySchema>;
export type StaffIdParamsSchema = z.infer<typeof staffIdParamsSchema>;
export type TeamIdParamsSchema = z.infer<typeof teamIdParamsSchema>;

// Auto-exported after fastify-zod migration
export {
  conversationCoreSchema,
  updateConversationSchema,
  conversationParamsSchema,
  deleteConversationsSchema,
  contactConversationsParamsSchema,
  conversationAssigneeUpdateSchema,
  statsQuerySchema,
  staffIdParamsSchema,
  teamIdParamsSchema,
  inboxActorSchema,
  inboxStatusSchema,
  closeReasonSchema,
};

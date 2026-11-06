import { z } from "zod";

export const leadSource = z.enum([
  "WHATSAPP",
  "INSTAGRAM",
  "MESSENGER",
  "WEBCHAT",
  "SURVEY",
  "REFERRAL",
  "LOYALTY",
  "MANUAL",
]);
const leadChannel = z.enum(["NONE", "WHATSAPP", "INSTAGRAM", "MESSENGER"]);
const leadTaskType = z.enum(["CALL", "MESSAGE", "MEETING", "DOCUMENT", "TODO"]);

export const idParamsSchema = z.object({
  id: z.uuid(),
});

/** A share link's id — `getShortUrlId()`'s length. */
export const shortUrlIdParamsSchema = z.object({
  id: z.string().length(8),
});

export const leadFilter = z.enum(["open", "mine", "rotting", "noactivity", "won", "lost"]);

/**
 * The board's read query. Every facet the sidebar and header expose is a
 * parameter here rather than a client-side filter, so a column's page is the
 * server's answer to the same question the counts were computed from.
 *
 * `stageId` names one board column — the board asks per column so a stage
 * holding a single match still returns it, which a board-wide LIMIT could not.
 * Omitting it reads the whole board, which is what the list view's ungrouped
 * mode wants.
 */
export const listLeadsQuerySchema = z.object({
  pipelineId: z.uuid(),
  stageId: z.uuid().optional(),
  /** Opaque keyset cursor, taken from the previous page's `nextCursor`. */
  cursor: z.string().max(300).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  filter: leadFilter.default("open"),
  search: z.string().trim().max(160).optional(),
  source: leadSource.optional(),
  assigneeId: z.uuid().optional(),
});
export type ListLeadsQuerySchema = z.infer<typeof listLeadsQuerySchema>;
export type LeadFilter = z.infer<typeof leadFilter>;

export const createLeadRequestSchema = z.object({
  pipelineId: z.uuid(),
  stageId: z.uuid(),
  name: z.string().min(1).max(160),
  description: z.string().max(5000).nullish(),
  company: z.string().max(160).nullish(),
  phone: z.string().max(32).nullish(),
  email: z.email().nullish(),
  source: leadSource.default("MANUAL"),
  channel: leadChannel.default("NONE"),
  contactId: z.uuid().nullish(),
  expectedCloseAt: z.iso.datetime().nullish(),
  labelIds: z.array(z.uuid()).optional(),
  assigneeIds: z.array(z.uuid()).optional(),
});

export const updateLeadRequestSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(5000).nullish(),
  company: z.string().max(160).nullish(),
  phone: z.string().max(32).nullish(),
  email: z.email().nullish(),
  source: leadSource.optional(),
  channel: leadChannel.optional(),
  contactId: z.uuid().nullish(),
  expectedCloseAt: z.iso.datetime().nullish(),
  labelIds: z.array(z.uuid()).optional(),
  assigneeIds: z.array(z.uuid()).optional(),
});

export const moveLeadRequestSchema = z.object({
  stageId: z.uuid(),
});

export const closeLeadRequestSchema = z.object({
  status: z.enum(["WON", "LOST"]),
  /** The closing column the lead was dropped on. Omitted when the close came
   *  from a button rather than a drag, and the board then picks the first
   *  column of that status. */
  stageId: z.uuid().optional(),
  lostReasonId: z.uuid().nullish(),
  note: z.string().max(2000).optional(),
});

export const bulkUpdateLeadsRequestSchema = z
  .object({
    leadIds: z.array(z.uuid()).min(1).max(200),
    stageId: z.uuid().optional(),
    assigneeIds: z.array(z.uuid()).optional(),
  })
  .refine((value) => value.stageId !== undefined || value.assigneeIds !== undefined, {
    message: "Provide at least one field to update",
  });

export const bulkDeleteLeadsRequestSchema = z.object({
  leadIds: z.array(z.uuid()).min(1).max(200),
});

export const createNoteRequestSchema = z.object({
  text: z.string().min(1).max(4000),
});

export const createTaskRequestSchema = z.object({
  type: leadTaskType.default("TODO"),
  title: z.string().min(1).max(200),
  dueAt: z.iso.datetime().nullish(),
  assigneeId: z.uuid().nullish(),
});

export const updateTaskRequestSchema = z.object({
  type: leadTaskType.optional(),
  title: z.string().min(1).max(200).optional(),
  dueAt: z.iso.datetime().nullish(),
  assigneeId: z.uuid().nullish(),
  completed: z.boolean().optional(),
});

export type CreateLeadRequestSchema = z.infer<typeof createLeadRequestSchema>;
export type UpdateLeadRequestSchema = z.infer<typeof updateLeadRequestSchema>;
export type CloseLeadRequestSchema = z.infer<typeof closeLeadRequestSchema>;
export type BulkUpdateLeadsRequestSchema = z.infer<typeof bulkUpdateLeadsRequestSchema>;
export type BulkDeleteLeadsRequestSchema = z.infer<typeof bulkDeleteLeadsRequestSchema>;
export type CreateNoteRequestSchema = z.infer<typeof createNoteRequestSchema>;
export type CreateTaskRequestSchema = z.infer<typeof createTaskRequestSchema>;
export type UpdateTaskRequestSchema = z.infer<typeof updateTaskRequestSchema>;

/** Params for the inbox panel's contact-stage endpoints. */
export const contactIdParamsSchema = z.object({ contactId: z.uuid() });
export type ContactIdParamsSchema = z.infer<typeof contactIdParamsSchema>;

/** Body for setting a contact's stage from the inbox panel. */
export const setContactStageRequestSchema = z.object({ stageId: z.uuid() });
export type SetContactStageRequestSchema = z.infer<typeof setContactStageRequestSchema>;

/**
 * Body for the contacts table's bulk assign. Capped because the handler walks the
 * selection one contact at a time; a bigger selection needs a background job, not
 * a longer request.
 */
export const bulkSetContactStageRequestSchema = z.object({
  stageId: z.uuid(),
  contactIds: z.array(z.uuid()).min(1).max(500),
});
export type BulkSetContactStageRequestSchema = z.infer<typeof bulkSetContactStageRequestSchema>;

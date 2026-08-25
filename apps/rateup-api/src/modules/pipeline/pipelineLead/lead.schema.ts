import { z } from "zod";

const leadSource = z.enum([
  "WHATSAPP",
  "INSTAGRAM",
  "MESSENGER",
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

export const listLeadsQuerySchema = z.object({
  pipelineId: z.uuid(),
});

export const createLeadRequestSchema = z.object({
  pipelineId: z.uuid(),
  stageId: z.uuid(),
  name: z.string().min(1).max(160),
  company: z.string().max(160).nullish(),
  phone: z.string().max(32).nullish(),
  email: z.email().nullish(),
  source: leadSource.default("MANUAL"),
  channel: leadChannel.default("NONE"),
  teamId: z.uuid().nullish(),
  contactId: z.uuid().nullish(),
  expectedCloseAt: z.iso.datetime().nullish(),
  labelIds: z.array(z.uuid()).optional(),
  assigneeIds: z.array(z.uuid()).optional(),
});

export const updateLeadRequestSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  company: z.string().max(160).nullish(),
  phone: z.string().max(32).nullish(),
  email: z.email().nullish(),
  source: leadSource.optional(),
  channel: leadChannel.optional(),
  teamId: z.uuid().nullish(),
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
    teamId: z.uuid().nullish(),
    assigneeIds: z.array(z.uuid()).optional(),
  })
  .refine(
    (value) =>
      value.stageId !== undefined || value.assigneeIds !== undefined || value.teamId !== undefined,
    { message: "Provide at least one field to update" },
  );

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

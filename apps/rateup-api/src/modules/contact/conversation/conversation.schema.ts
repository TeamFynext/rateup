import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

const conversationCoreSchema = z.object({
  contactId: z.string().uuid(),
  status: z.string().optional(),
});

const updateConversationSchema = z.object({
  status: z.string().optional(),
  firstRespondedAt: z.date().optional(),
  assignedAt: z.date().optional(),
  closedAt: z.date().optional(),
  closedBy: z.string().uuid().optional(),
});

const conversationAssigneeUpdateSchema = z.object({
  assignees: z
    .array(
      z.object({
        userId: z.string().uuid(),
        teamId: z.string().uuid().optional(),
      }),
    )
    .optional(),
  assignedAt: z.date().optional(),
  removedAt: z.date().optional(),
  assignedBy: z.string().uuid().optional(),
  removedBy: z.string().uuid().optional(),
});

const conversationParamsSchema = z.object({
  conversationId: z.string().uuid(),
});

const statsQuerySchema = z.object({
  dateKey: z.string().optional(),
  dateRange: z.string().optional(),
  days: z.number().optional(),
});

const staffIdParamsSchema = z.object({
  staffId: z.string(),
});

export const { schemas: conversationSchemas, $ref: $conversationRef } =
  buildJsonSchemas(
    {
      conversationCoreSchema,
      updateConversationSchema,
      conversationParamsSchema,
      conversationAssigneeUpdateSchema,
      statsQuerySchema,
      staffIdParamsSchema,
    },
    { $id: "ConversationSchemas" },
  );

export type ConversationCore = z.infer<typeof conversationCoreSchema>;
export type UpdateConversationSchema = z.infer<typeof updateConversationSchema>;
export type ConversationParamsSchema = z.infer<typeof conversationParamsSchema>;
export type ConversationAssigneeUpdateSchema = z.infer<
  typeof conversationAssigneeUpdateSchema
>;
export type StatsQuerySchema = z.infer<typeof statsQuerySchema>;
export type StaffIdParamsSchema = z.infer<typeof staffIdParamsSchema>;

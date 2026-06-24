import z from "zod";

const conversationCoreSchema = z.object({
  contactId: z.uuid(),
  status: z.string().optional(),
});

const updateConversationSchema = z.object({
  status: z.string().optional(),
  firstRespondedAt: z.date().optional(),
  assignedAt: z.date().optional(),
  closedAt: z.date().optional(),
  closedBy: z.uuid().optional(),
  firstRespondedByUserAt: z.date().optional(),
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
export type ConversationParamsSchema = z.infer<typeof conversationParamsSchema>;
export type ConversationAssigneeUpdateSchema = z.infer<typeof conversationAssigneeUpdateSchema>;
export type StatsQuerySchema = z.infer<typeof statsQuerySchema>;
export type StaffIdParamsSchema = z.infer<typeof staffIdParamsSchema>;
export type TeamIdParamsSchema = z.infer<typeof teamIdParamsSchema>;

// Auto-exported after fastify-zod migration
export {
  conversationCoreSchema,
  updateConversationSchema,
  conversationParamsSchema,
  conversationAssigneeUpdateSchema,
  statsQuerySchema,
  staffIdParamsSchema,
  teamIdParamsSchema,
};

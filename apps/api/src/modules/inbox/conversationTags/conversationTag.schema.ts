import { z } from "zod";

const createConversationTagSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().optional().default("#3b82f6"),
  description: z.string().optional(),
});

const updateConversationTagSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  color: z.string().optional(),
  description: z.string().optional(),
});

const byTagIdSchema = z.object({
  tagId: z.uuid(),
});

const byConversationIdSchema = z.object({
  conversationId: z.uuid(),
});

const assignTagsToConversationSchema = z.object({
  tagIds: z.array(z.uuid()),
});

const conversationTagResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  description: z.string().nullable().optional(),
  createdAt: z.date(),
  orgId: z.string(),
  /// Number of conversations currently carrying the tag — the settings list
  /// shows it next to each row.
  conversationCount: z.number().optional(),
});

export type CreateConversationTagSchema = z.infer<typeof createConversationTagSchema>;
export type UpdateConversationTagSchema = z.infer<typeof updateConversationTagSchema>;
export type ByTagIdSchema = z.infer<typeof byTagIdSchema>;
export type ByConversationIdSchema = z.infer<typeof byConversationIdSchema>;
export type AssignTagsToConversationSchema = z.infer<typeof assignTagsToConversationSchema>;

export {
  createConversationTagSchema,
  updateConversationTagSchema,
  byTagIdSchema,
  byConversationIdSchema,
  assignTagsToConversationSchema,
  conversationTagResponseSchema,
};

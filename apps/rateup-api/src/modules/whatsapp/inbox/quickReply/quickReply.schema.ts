import z from "zod";

const byQuickReplyIdParamSchema = z.object({
  quickReplyId: z.string(),
});

const quickReplyCore = z.object({
  text: z.string(),
  topic: z.string(),
  key: z.string(),
});

const updateQuickReplyShema = quickReplyCore.partial();

const updateOrderSchema = z.array(
  z.object({
    id: z.string(),
    priority: z.number(),
  }),
);

export type UpdateQuickReplyInput = z.infer<typeof updateQuickReplyShema>;
export type QuickReplyBody = z.infer<typeof quickReplyCore>;
export type ByQuickReplyIdParam = z.infer<typeof byQuickReplyIdParamSchema>;
export type UpdateOrderBody = z.infer<typeof updateOrderSchema>;

// Auto-exported after fastify-zod migration
export { byQuickReplyIdParamSchema, quickReplyCore, updateQuickReplyShema, updateOrderSchema };

import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

const byQuickReplyIdParamSchema = z.object({
  quickReplyId: z.string(),
});

export const quickReplyCore = z.object({
  text: z.string(),
  priority: z.number(),
});

const updateQuickReplyShema = quickReplyCore.partial();

const updateOrderSchema = z.array(
  z.object({
    id: z.string(),
    priority: z.number(),
  }),
);

export const { schemas: quickReplySchema, $ref: $quickReplyRef } =
  buildJsonSchemas(
    {
      byQuickReplyIdParamSchema,
      quickReplyCore,
      updateQuickReplyShema,
      updateOrderSchema,
    },
    { $id: "quickReplySchema" },
  );

export type UpdateQuickReplyInput = z.infer<typeof updateQuickReplyShema>;
export type QuickReplyBody = z.infer<typeof quickReplyCore>;
export type ByQuickReplyIdParam = z.infer<typeof byQuickReplyIdParamSchema>;
export type UpdateOrderBody = z.infer<typeof updateOrderSchema>;

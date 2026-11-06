import z from "zod";

const byQuickReplyIdParamSchema = z.object({
  quickReplyId: z.string(),
});

/** Mirrors the composer's attachment entry, so a pick drops straight into a draft. */
const quickReplyMediaItem = z.object({
  type: z.enum(["image", "audio", "video"]),
  url: z.url(),
  key: z.string().min(1),
  name: z.string(),
});

const quickReplyCore = z.object({
  text: z.string(),
  topic: z.string(),
  key: z.string(),
  media: z.array(quickReplyMediaItem).max(5).default([]),
});

// Spelled out rather than `quickReplyCore.partial()`, which would keep `media`'s
// default and wipe the attachments of every update that does not mention them.
const updateQuickReplyShema = z
  .object({
    text: z.string(),
    topic: z.string(),
    key: z.string(),
    media: z.array(quickReplyMediaItem).max(5),
  })
  .partial();

const updateOrderSchema = z.array(
  z.object({
    id: z.string(),
    priority: z.number(),
  }),
);

export type UpdateQuickReplyInput = z.infer<typeof updateQuickReplyShema>;
export type QuickReplyBody = z.input<typeof quickReplyCore>;
export type QuickReplyMediaItem = z.infer<typeof quickReplyMediaItem>;
export type ByQuickReplyIdParam = z.infer<typeof byQuickReplyIdParamSchema>;
export type UpdateOrderBody = z.infer<typeof updateOrderSchema>;

// Auto-exported after fastify-zod migration
export { byQuickReplyIdParamSchema, quickReplyCore, updateQuickReplyShema, updateOrderSchema };

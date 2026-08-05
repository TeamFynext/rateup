import { z } from "zod";

const idParamsSchema = z.object({
  id: z.string(),
});

const createCommentRequestSchema = z.object({
  ticketCardId: z.string(),
  msg: z.string().trim().min(1).max(5000),
});

export type IdParamsSchema = z.infer<typeof idParamsSchema>;
export type CreateCommentInput = z.infer<typeof createCommentRequestSchema>;

// Auto-exported after fastify-zod migration
export { idParamsSchema, createCommentRequestSchema };

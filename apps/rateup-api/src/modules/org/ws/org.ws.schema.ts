import { z } from "zod";
const afterAuthIdParamsSchema = z.object({
  afterAuthId: z.string(),
  role: z.string().optional(),
});

export type AfterAuthIdParams = z.infer<typeof afterAuthIdParamsSchema>;

// Auto-exported after fastify-zod migration
export { afterAuthIdParamsSchema };

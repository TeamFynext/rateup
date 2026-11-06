import { z } from "zod";

const idParamsSchema = z.object({
  id: z.string(),
});

export type IdParamsSchema = z.infer<typeof idParamsSchema>;

// Auto-exported after fastify-zod migration
export { idParamsSchema };

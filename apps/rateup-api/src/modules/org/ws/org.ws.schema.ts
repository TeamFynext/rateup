import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
const afterAuthIdParamsSchema = z.object({
  afterAuthId: z.string(),
  role: z.string().optional(),
});

export const { schemas: orgWsSchemas, $ref: $orgWsRef } = buildJsonSchemas(
  {
    afterAuthIdParamsSchema,
  },
  { $id: "orgws" },
);

export type AfterAuthIdParams = z.infer<typeof afterAuthIdParamsSchema>;

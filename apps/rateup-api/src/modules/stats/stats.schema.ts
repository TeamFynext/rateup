import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const idParamsSchema = z.object({
  id: z.string(),
});

export const { schemas: statsSchemas, $ref: $StatRef } = buildJsonSchemas(
  {
    idParamsSchema,
  },
  { $id: "statsSchema" },
);

export type IdParamsSchema = z.infer<typeof idParamsSchema>;

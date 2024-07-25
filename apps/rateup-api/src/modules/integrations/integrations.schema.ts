import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

const byNameSchema = z.object({
  name: z.string(),
});

const byIdSchema = z.object({
  id: z.string(),
});

export const integrationSchema = z.object({
  credential: z.object({
    apiKey: z.string(),
    baseUrl: z.string().url(),
  }),
  name: z.string(),
});
export const { schemas: integrationSchemas, $ref: $integrationRef } =
  buildJsonSchemas(
    {
      byNameSchema,
      byIdSchema,
      integrationSchema,
    },
    {
      $id: "integrationSchema",
    },
  );

export type ByNameParams = z.infer<typeof byNameSchema>;

export type ByIdParams = z.infer<typeof byIdSchema>;

export type IntegrationSchema = z.infer<typeof integrationSchema>;

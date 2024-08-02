import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

const byNameSchema = z.object({
  name: z.string(),
});

const byIdSchema = z.object({
  id: z.string(),
});

export const integrationSchema = z.object({
  //for amelia
  // credential: z.object({
  //   apiKey: z.string(),
  //   baseUrl: z.string().url(),
  //   serviceId: z.number(),
  // }),
  credential: z.record(z.string(), z.any()),
  name: z.string(),
});

export const updateIntgrationSchema = z.object({
  credential: z.record(z.string(), z.any()).optional(),
  orgId: z.string().optional(),
  active: z.boolean().optional(),
});

export const { schemas: integrationSchemas, $ref: $integrationRef } =
  buildJsonSchemas(
    {
      byNameSchema,
      byIdSchema,
      integrationSchema,
      updateIntgrationSchema,
    },
    {
      $id: "integrationSchema",
    },
  );

export type ByNameParams = z.infer<typeof byNameSchema>;

export type ByIdParams = z.infer<typeof byIdSchema>;

export type IntegrationSchema = z.infer<typeof integrationSchema>;

export type UpdateIntgrationInput = z.infer<typeof updateIntgrationSchema>;

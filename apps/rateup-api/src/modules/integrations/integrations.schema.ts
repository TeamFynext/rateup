import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

const byNameSchema = z.object({
  name: z.string(),
});

const byIdSchema = z.object({
  id: z.string(),
});
enum Providers {
  razorpay = "razorpay",
  payu = "payu",
  zaakpay = "zaakpay",
}

const waPaymentCreateSchema = z.object({
  configuration_name: z
    .string()
    .min(4, "configuration_name must be at least 4 characters long")
    .max(40, "configuration_name must be at most 40 characters long")
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "configuration_name can only contain alphanumeric characters, periods, hyphens, and underscores",
    )
    .regex(/^\S*$/, "configuration_name cannot contain spaces"),
  purpose_code: z.string().min(1),
  merchant_category_code: z.string().min(1),
  provider_name: z.nativeEnum(Providers),
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
  updateKey: z.boolean().optional(),
});

export const { schemas: integrationSchemas, $ref: $integrationRef } =
  buildJsonSchemas(
    {
      byNameSchema,
      byIdSchema,
      integrationSchema,
      updateIntgrationSchema,
      waPaymentCreateSchema,
    },
    {
      $id: "integrationSchema",
    },
  );

export type ByNameParams = z.infer<typeof byNameSchema>;

export type ByIdParams = z.infer<typeof byIdSchema>;

export type IntegrationSchema = z.infer<typeof integrationSchema>;

export type UpdateIntgrationInput = z.infer<typeof updateIntgrationSchema>;

export type WaPaymentCreateSchema = z.infer<typeof waPaymentCreateSchema>;

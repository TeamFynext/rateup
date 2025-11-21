import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

const businessHourCore = {
  name: z.string().min(1),
  timezone: z.string().min(1),
  channels: z.array(z.string()),
  description: z.string().optional(),
  schedule: z.record(z.any()), // JSON object for schedule
};

const createBusinessHourSchema = z.object({
  ...businessHourCore,
});

const updateBusinessHourSchema = z
  .object({
    ...businessHourCore,
  })
  .partial();

const businessHourResponseSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  ...businessHourCore,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const businessHourParamsSchema = z.object({
  id: z.string(),
});

export type CreateBusinessHourInput = z.infer<typeof createBusinessHourSchema>;
export type UpdateBusinessHourInput = z.infer<typeof updateBusinessHourSchema>;
export type BusinessHourParams = z.infer<typeof businessHourParamsSchema>;

export const { schemas: businessHourSchemas, $ref: $BusinessHourRef } =
  buildJsonSchemas(
    {
      createBusinessHourSchema,
      updateBusinessHourSchema,
      businessHourResponseSchema,
      businessHourParamsSchema,
    },
    {
      $id: "businessHour",
    },
  );

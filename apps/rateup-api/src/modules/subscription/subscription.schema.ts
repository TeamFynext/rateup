import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const updateSubscriptionInputSchema = z.object({
  features: z.any().optional(), // TODO: add validation
  expiresAt: z.date().optional(),
  renewedAt: z.date().optional(),
  basePlanId: z.string().uuid().optional(),
  isAnnualMessageLimit: z.boolean().optional(),
});
const deleteSubscriptionsInputSchema = z.array(z.string());

export const { schemas: subscriptionSchemas, $ref: $subscriptionRef } =
  buildJsonSchemas(
    {
      updateSubscriptionInputSchema,
      deleteSubscriptionsInputSchema,
    },
    { $id: "subscriptionSchema" },
  );

export type updateSubscriptionInput = z.infer<
  typeof updateSubscriptionInputSchema
>;
export type deleteSubscriptionsInput = z.infer<
  typeof deleteSubscriptionsInputSchema
>;

import { z } from "zod";

const updateSubscriptionInputSchema = z.object({
  features: z.any().optional(), // TODO: add validation
  expiresAt: z.iso.datetime().optional(),
  renewedAt: z.iso.datetime().optional(),
  basePlanId: z.uuid().optional(),
  isAnnualMessageLimit: z.boolean().optional(),
});
const deleteSubscriptionsInputSchema = z.array(z.string());

export type updateSubscriptionInput = z.infer<
  typeof updateSubscriptionInputSchema
>;
export type deleteSubscriptionsInput = z.infer<
  typeof deleteSubscriptionsInputSchema
>;

// Auto-exported after fastify-zod migration
export { updateSubscriptionInputSchema, deleteSubscriptionsInputSchema };

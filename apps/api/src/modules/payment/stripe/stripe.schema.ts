import { PaymentPlanStatus } from "../../../generated/prisma/client.js";

import { z } from "zod";

/**
 * A Stripe subscription checkout. The price is the only choice that matters: the tier, its
 * name and the org are resolved server-side (price → linked RateupPlan, org from the
 * session). `orgId`, `planName` and `rateupPlanId` are accepted from older clients and
 * ignored.
 */
const createStripeCheckoutSchema = z.object({
  priceId: z.string({
    error: (issue) => (issue.input === undefined ? "Price Id is required" : undefined),
  }),
  email: z.email("Invalid email.").optional(),
  orgId: z.string().optional(),
  planName: z.string().optional(),
  rateupPlanId: z.string().optional(),
});
const updateProductSchema = z.object({
  productId: z.string(),
  status: z.enum(PaymentPlanStatus).optional(),
});

const getSessionStatus = z.object({
  session_id: z.string(),
});

const productIdParamsSchema = z.object({
  productId: z.string(),
});

export type CreateStripeCheckoutInput = z.infer<typeof createStripeCheckoutSchema>;
export type updateProductInput = z.infer<typeof updateProductSchema>;

export type GetSessionStatusQuery = z.infer<typeof getSessionStatus>;
export type productIdParamsInput = z.infer<typeof productIdParamsSchema>;

// Auto-exported after fastify-zod migration
export { createStripeCheckoutSchema, updateProductSchema, getSessionStatus, productIdParamsSchema };

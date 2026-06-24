import { PaymentPlanStatus } from "../../../../generated/prisma/client.js";

import { z } from "zod";

const createStripeCheckoutSchema = z.object({
  orgId: z.string({
    error: (issue) => (issue.input === undefined ? "Org Id is required" : undefined),
  }),
  priceId: z.string({
    error: (issue) => (issue.input === undefined ? "Price Id is required" : undefined),
  }),
  planName: z.string({
    error: (issue) => (issue.input === undefined ? "Plan name is required" : undefined),
  }),
  rateupPlanId: z.string({
    error: (issue) => (issue.input === undefined ? "Rateup Plan Id is required" : undefined),
  }),
  email: z.email("Invalid email."),
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

import { PaymentPlanStatus } from "../../../generated/prisma/client.js";

import { z } from "zod";
import { PaymentPlanType } from "./payment.service.js";

/**
 * A subscription checkout. Only the tier and, optionally, which of its linked gateway plans
 * (the currency) are the customer's to choose; the server resolves the price and cadence
 * from those links and the org from the session. `orgId`, `planName` and
 * `isAnnualMessageLimit` are still accepted from older clients and ignored.
 */
const createCheckoutRequestSchema = z.object({
  rateupPlanId: z.string({
    error: (issue) => (issue.input === undefined ? "Rateup Plan Id is required" : undefined),
  }),
  planId: z.string().optional(),
  period: z.string().optional(),
  orgId: z.string().optional(),
  planName: z.string().optional(),
  isAnnualMessageLimit: z.boolean().optional(),
});
const createRateUpPlanSchema = z.object({
  name: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  displayWidgetId: z.string().optional(),
  planType: z.enum(PaymentPlanType),
  paymentPlanId: z.string().optional(),
  stripeId: z.string().optional(),
  description: z.array(z.string()).min(1),
  features: z.any().optional(),
  badge: z.string().trim().optional(),
  price: z.number().optional(),
  currency: z.enum(["USD", "INR"]).optional(),
  monthlyPrice: z.number().optional(),
  yearlyPrice: z.number().optional(),
  monthlyPaymentPlanId: z.string().optional(),
  yearlyPaymentPlanId: z.string().optional(),
});

const updateRateUpPlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).optional(),
  displayName: z.string().trim().min(1).optional(),
  displayWidgetId: z.string().optional(),
  planType: z.enum(PaymentPlanType).optional(),
  paymentPlanId: z.string().optional(),
  stripeId: z.string().optional(),
  description: z.array(z.string()).min(1).optional(),
  features: z.any().optional(),
  badge: z.string().trim().optional(),
  price: z.number().optional(),
  currency: z.enum(["USD", "INR"]).optional(),
  monthlyPrice: z.number().optional(),
  yearlyPrice: z.number().optional(),
  monthlyPaymentPlanId: z.string().optional(),
  yearlyPaymentPlanId: z.string().optional(),
});

const rateupPlanParamSchema = z.object({
  id: z.string(),
});

const paymentPlanDeleteSchema = z.object({
  id: z.string(),
  planId: z.string(),
});

const updatePlanSchema = z.object({
  id: z.string(),
  planId: z.string(),
  data: z.object({
    status: z.enum(PaymentPlanStatus).optional(),
  }),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutRequestSchema>;
export type createRateUpPlanInput = z.infer<typeof createRateUpPlanSchema>;
export type updateRateUpPlanInput = z.infer<typeof updateRateUpPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type rateupPlanParamInput = z.infer<typeof rateupPlanParamSchema>;
export type paymentPlanDeleteInput = z.infer<typeof paymentPlanDeleteSchema>;

// Auto-exported after fastify-zod migration
export {
  createCheckoutRequestSchema,
  createRateUpPlanSchema,
  updateRateUpPlanSchema,
  rateupPlanParamSchema,
  paymentPlanDeleteSchema,
  updatePlanSchema,
};

export const orderIdParamsSchema = z.object({
  orderId: z.uuid(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "COMPLETE", "FAILED"]),
});

export type OrderIdParamsInput = z.infer<typeof orderIdParamsSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

/** Body for switching a live subscription onto another tier. */
export const changePlanSchema = z.object({
  rateupPlanId: z.string().min(1),
  period: z.enum(["monthly", "yearly"]),
});

export type ChangePlanInput = z.infer<typeof changePlanSchema>;

/** How many packs one order buys. The service caps it too. */
export const addonOrderSchema = z.object({
  quantity: z.number().int().positive().max(20).default(1),
});
export type AddonOrderInput = z.infer<typeof addonOrderSchema>;

/** The URL spelling of each pack kind. */
export const addonKindParamsSchema = z.object({
  kind: z.enum(["active-contacts", "campaign-credits"]),
});
export type AddonKindParams = z.infer<typeof addonKindParamsSchema>;

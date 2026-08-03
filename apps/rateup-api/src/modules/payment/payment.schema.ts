import { PaymentPlanStatus } from "../../../generated/prisma/client.js";

import { z } from "zod";
import { PaymentPlanType } from "./payment.service.js";

const createCheckoutRequestSchema = z.object({
  orgId: z.string({
    error: (issue) => (issue.input === undefined ? "Org Id is required" : undefined),
  }),
  planId: z.string({
    error: (issue) => (issue.input === undefined ? "Plan Id is required" : undefined),
  }),
  planName: z.string({
    error: (issue) => (issue.input === undefined ? "Plan name is required" : undefined),
  }),
  period: z.string({
    error: (issue) => (issue.input === undefined ? "Plan Period is required" : undefined),
  }),
  rateupPlanId: z.string({
    error: (issue) => (issue.input === undefined ? "Rateup Plan Id is required" : undefined),
  }),
  isAnnualMessageLimit: z.boolean(),
  trialDays: z.number().optional(),
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
  trialDays: z.number(),
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
  trialDays: z.number().optional(),
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

const orgPlanEmailSchema = z.object({
  name: z.string(),
  email: z.string(),
  orgName: z.string().optional(),
  planName: z.string(),
  planId: z.string().optional(),
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
export type orgPlanEmailInput = z.infer<typeof orgPlanEmailSchema>;

// Auto-exported after fastify-zod migration
export {
  createCheckoutRequestSchema,
  createRateUpPlanSchema,
  updateRateUpPlanSchema,
  rateupPlanParamSchema,
  paymentPlanDeleteSchema,
  orgPlanEmailSchema,
};

export const orderIdParamsSchema = z.object({
  orderId: z.uuid(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "COMPLETE", "FAILED"]),
});

export type OrderIdParamsInput = z.infer<typeof orderIdParamsSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

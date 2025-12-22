import { PaymentPlanStatus } from "../../../generated/prisma/client.js";
import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { PaymentPlanType } from "./payment.service.js";

const createCheckoutRequestSchema = z.object({
  orgId: z.string({
    required_error: "Org Id is required",
  }),
  planId: z.string({
    required_error: "Plan Id is required",
  }),
  planName: z.string({
    required_error: "Plan name is required",
  }),
  period: z.string({
    required_error: "Plan Period is required",
  }),
  rateupPlanId: z.string({
    required_error: "Rateup Plan Id is required",
  }),
  isAnnualMessageLimit: z.boolean(),
  trialDays: z.number().optional(),
});
const createRateUpPlanSchema = z.object({
  name: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  displayWidgetId: z.string().optional(),
  planType: z.nativeEnum(PaymentPlanType),
  paymentPlanId: z.string().optional(),
  stripeId: z.string().optional(),
  description: z.array(z.string()).min(1),
  features: z.any().optional(),
  trialDays: z.number(),
});

const updateRateUpPlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).optional(),
  displayName: z.string().trim().min(1).optional(),
  displayWidgetId: z.string().optional(),
  planType: z.nativeEnum(PaymentPlanType).optional(),
  paymentPlanId: z.string().optional(),
  stripeId: z.string().optional(),
  description: z.array(z.string()).min(1).optional(),
  features: z.any().optional(),
  trialDays: z.number().optional(),
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

export const { schemas: paymentSchemas, $ref: $Pref } = buildJsonSchemas(
  {
    createCheckoutRequestSchema,
    createRateUpPlanSchema,
    updateRateUpPlanSchema,
    rateupPlanParamSchema,
    paymentPlanDeleteSchema,
    orgPlanEmailSchema,
  },
  { $id: "paymentSchema" },
);

const updatePlanSchema = z.object({
  id: z.string(),
  planId: z.string(),
  data: z.object({
    status: z.nativeEnum(PaymentPlanStatus).optional(),
  }),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutRequestSchema>;
export type createRateUpPlanInput = z.infer<typeof createRateUpPlanSchema>;
export type updateRateUpPlanInput = z.infer<typeof updateRateUpPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type rateupPlanParamInput = z.infer<typeof rateupPlanParamSchema>;
export type paymentPlanDeleteInput = z.infer<typeof paymentPlanDeleteSchema>;
export type orgPlanEmailInput = z.infer<typeof orgPlanEmailSchema>;

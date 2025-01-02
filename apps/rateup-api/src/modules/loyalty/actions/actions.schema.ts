import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

export enum LoyaltyActionType {
  ReferralPurchase = "Referral Purchase",
  DirectPurchase = "Direct Purchase",
  CustomerRegistration = "Customer Registration",
}

export const lActionSchema = z.object({
  name: z.string(),
  type: z.nativeEnum(LoyaltyActionType),
  points: z.number(),
  isAmountBased: z.boolean().optional(),
  amount: z.number().optional(),
  maxPoints: z.number().optional(),
  refereePoints: z.number().optional(),
  startDate: z.date(),
  endDate: z.date(),
  waTemplateId: z.string().optional(),
  refereeWaTemplateId: z.string().optional(),
  isAmountBasedForReferee: z.boolean().optional(),
  maxPointsForReferee: z.number().optional(),
  isExistingUserReferralAllowed: z.boolean().optional(),
  active: z.boolean().optional(),
  description: z.string(),
  message: z
    .object({
      message: z.string(),
      forwardMessage: z.string().optional(),
    })
    .optional()
    .nullable(),
  action_id: z.string(),
  rewardId: z.string().optional(),
  refereeRewardId: z.string().optional(),
});

const lActionUpdateSchema = lActionSchema.omit({ type: true }).partial();

const byLActiondIdParamSchema = z.object({
  actionId: z.string(),
});

const byReferralCodeParamsSchema = z.object({
  referralCode: z.string(),
});

const referSchema = z.object({
  refereePhone: z.string(),
  refereeName: z.string().optional(),
  amount: z.number().optional(),
  issuePurchasePoints: z.boolean().optional(),
  actionIds: z.array(z.string()),
});
export const { schemas: loyaltyActionSchemas, $ref: $lActionRef } =
  buildJsonSchemas(
    {
      lActionSchema,
      byLActiondIdParamSchema,
      lActionUpdateSchema,
      byReferralCodeParamsSchema,
      referSchema,
    },
    {
      $id: "loyaltyActionSchema",
    },
  );

export type loyaltyActionInput = z.infer<typeof lActionSchema>;
export type lActionIdParamInput = z.infer<typeof byLActiondIdParamSchema>;
export type lActionUpdateInput = z.infer<typeof lActionUpdateSchema>;
export type ByReferralCodeParamInput = z.infer<
  typeof byReferralCodeParamsSchema
>;
export type ReferralInput = z.infer<typeof referSchema>;

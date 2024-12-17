import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

export enum LoyaltyActionType {
  ReferFriend = "Refer a Friend",
  ReferralPurchase = "Referral Purchase",
  DirectPurchase = "Direct Purchase",
}

const lActionSchema = z.object({
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
});

const lActionUpdateSchema = z.object({
  name: z.string().optional(),
  points: z.number().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  waTemplateId: z.string().optional(),
  refereePoints: z.number().optional(),
});

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

import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

export enum LoyaltyActionType {
  ReferFriend = "Refer a Friend",
  ReferralPurchase = "Referral Purchase",
  DirectPurchase = "Direct Purchase",
}

export const lActionSchema = z.object({
  name: z.string(),
  type: z.nativeEnum(LoyaltyActionType),
  points: z.number(),
  startDate: z.date(),
  endDate: z.date(),
});

const lActionUpdateSchema = z.object({
  name: z.string().optional(),
  points: z.number().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

const byLActiondIdParamSchema = z.object({
  actionId: z.string(),
});

export const { schemas: loyaltyActionSchemas, $ref: $lActionRef } =
  buildJsonSchemas(
    {
      lActionSchema,
      byLActiondIdParamSchema,
      lActionUpdateSchema,
    },
    {
      $id: "loyaltyActionSchema",
    },
  );

export type loyaltyActionInput = z.infer<typeof lActionSchema>;
export type lActionIdParamInput = z.infer<typeof byLActiondIdParamSchema>;
export type lActionUpdateInput = z.infer<typeof lActionUpdateSchema>;

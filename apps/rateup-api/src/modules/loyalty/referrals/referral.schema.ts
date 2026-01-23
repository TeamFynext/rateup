import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

export const trackReferralSchema = z.object({
  referralCode: z.string().min(1, "Referral code is required"),
  refereeContactId: z.string().min(1, "Referee contact ID is required"),
});

export const completeReferralSchema = z.object({
  referralId: z.string().min(1),
  purchaseAmount: z.number().min(0),
});

export const referrerIdParamSchema = z.object({
  referrerId: z.string(),
});

export const { schemas: referralSchemas, $ref: $referralRef } =
  buildJsonSchemas(
    {
      trackReferralSchema,
      completeReferralSchema,
      referrerIdParamSchema,
    },
    {
      $id: "referralSchema",
    },
  );

export type TrackReferralInput = z.infer<typeof trackReferralSchema>;
export type CompleteReferralInput = z.infer<typeof completeReferralSchema>;
export type ReferrerIdParam = z.infer<typeof referrerIdParamSchema>;

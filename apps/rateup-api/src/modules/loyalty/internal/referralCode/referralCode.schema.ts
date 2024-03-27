import { LcReferralCode } from "@prisma/client";
import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const byReferralCodeParamsSchema = z.object({
  referralCode: z.string(),
});

export const lcReferralCodeSchema = z.object({
  referralCode: z.string(),
  orgId: z.string(),
  createdAt: z.date(),
  loyaltyCampaignId: z.string(),
  customerId: z.string(),
});

export const createLcReferralCodeSchema = lcReferralCodeSchema.omit({
  createdAt: true,
  orgId: true,
});
export const generateReferralCodeSchema = createLcReferralCodeSchema.omit({
  referralCode: true,
});
export const updateLcReferralCodeSchema = createLcReferralCodeSchema.partial();

export const { schemas: referralCodeSchema, $ref: $referralCodeRef } =
  buildJsonSchemas(
    {
      byReferralCodeParamsSchema,
    },
    {
      $id: "referralCode",
    },
  );

export type ByReferralCodeParams = z.infer<typeof byReferralCodeParamsSchema>;
export type CreateReferralCodeInput = Omit<LcReferralCode, "createdAt">;
export type UpdateReferralCodeInput = Partial<CreateReferralCodeInput>;
export type GenerateReferralCodeInput = Omit<
  CreateReferralCodeInput,
  "referralCode"
>;

import { LcReferralCode } from "@prisma/client";
import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const byReferralCodeParamsSchema = z.object({
  referralCode: z.string(),
});

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

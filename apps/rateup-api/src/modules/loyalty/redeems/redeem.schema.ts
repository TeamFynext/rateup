import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

const rewardCustomerParamSchema = z.object({
  rewardId: z.string(),
  customerId: z.string(),
});

const redeemIdParamSchema = z.object({
  redeemId: z.string(),
});

const redeemUpdateSchema = z.object({
  status: z.string().optional(),
});

export const { schemas: loyaltyRedeemSchemas, $ref: $lRedeemRef } =
  buildJsonSchemas(
    {
      rewardCustomerParamSchema,
      redeemIdParamSchema,
      redeemUpdateSchema,
    },
    { $id: "loyaltyRedeemSchema" },
  );

export type CustomerRewardInput = z.infer<typeof rewardCustomerParamSchema>;
export type RedeemIdParamInput = z.infer<typeof redeemIdParamSchema>;
export type RedeemUpdateInput = z.infer<typeof redeemUpdateSchema>;

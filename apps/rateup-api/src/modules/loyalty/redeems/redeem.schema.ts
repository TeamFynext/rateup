import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

const rewardCustomerParamSchema = z.object({
  rewardId: z.string(),
  customerId: z.string(),
});

export const { schemas: loyaltyRedeemSchemas, $ref: $lRedeemRef } =
  buildJsonSchemas(
    {
      rewardCustomerParamSchema,
    },
    { $id: "loyaltyRedeemSchema" },
  );

export type CustomerRewardInput = z.infer<typeof rewardCustomerParamSchema>;

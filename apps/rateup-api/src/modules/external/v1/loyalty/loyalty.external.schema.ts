import { buildJsonSchemas } from "fastify-zod";
import z from "zod";
import {
  lActionSchema,
  LoyaltyActionType,
} from "../../../loyalty/actions/actions.schema.js";
import { lRewardSchema } from "../../../loyalty/rewards/rewards.schema.js";
import { RedeemStatus } from "../../../loyalty/redeems/redeem.service.js";

const lRewardResponseSchema = z
  .object({
    id: z.string(),
    createdAt: z.date(),
  })
  .merge(lRewardSchema);

const redeemResponseSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(RedeemStatus),
  createdAt: z.date(),
  customer: z.object({
    name: z.string(),
    phone: z.string(),
  }),
  reward: z.object({
    name: z.string(),
    points: z.number(),
  }),
});

const lCustomerResponseSchema = z.object({
  id: z.string(),
  customerInfo: z.object({
    name: z.string(),
    phone: z.string(),
    email: z.string().optional(),
    createdAt: z.string(),
  }),
  [LoyaltyActionType.DirectPurchase]: z.array(z.any()),
  [LoyaltyActionType.ReferralPurchase]: z.array(z.any()),
  redeems: z.array(z.any()),
  totalPoints: z.number(),
  balancePoints: z.number(),
});

const lActionSchemaResponseSchema = z
  .object({
    id: z.string(),
    createdAt: z.date(),
  })
  .merge(lActionSchema);

const customerActionQuerySchema = z.object({
  phone: z.string(),
  action_id: z.string(),
});

const customerRedeemQuerySchema = z.object({
  phone: z.string(),
  reward_id: z.string(),
});

export const { schemas: extLoyaltySchemas, $ref: $extLoyaltyRef } =
  buildJsonSchemas(
    {
      redeemResponseSchema,
      lRewardResponseSchema,
      lCustomerResponseSchema,
      lActionSchemaResponseSchema,
      customerActionQuerySchema,
      customerRedeemQuerySchema,
    },
    {
      $id: "extLoyaltySchemas",
    },
  );
export type CustomerActionQueryInput = z.infer<
  typeof customerActionQuerySchema
>;
export type customerRedeemQueryInput = z.infer<
  typeof customerRedeemQuerySchema
>;

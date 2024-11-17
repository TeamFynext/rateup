import { buildJsonSchemas } from "fastify-zod";
import z from "zod";
import { lRewardSchema } from "./reward/internal-copy/rewards/rewards.schema";
import { RedeemStatus } from "./redeem/internal-copy/redeems/redeem.service";
import {
  lActionSchema,
  LoyaltyActionType,
} from "./action/internal-copy/actions/actions.schema";

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
  [LoyaltyActionType.ReferFriend]: z.array(z.any()),
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

export const { schemas: extLoyaltySchemas, $ref: $extLoyaltyRef } =
  buildJsonSchemas(
    {
      redeemResponseSchema,
      lRewardResponseSchema,
      lCustomerResponseSchema,
      lActionSchemaResponseSchema,
    },
    {
      $id: "extLoyaltySchemas",
    },
  );

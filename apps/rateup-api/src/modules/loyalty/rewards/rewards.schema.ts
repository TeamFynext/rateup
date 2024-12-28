import { buildJsonSchemas } from "fastify-zod";
import z from "zod";
import { RewardTypes } from "../util";

const lRewardSchema = z.object({
  name: z.string(),
  points: z.number().int(),
  maxPerUser: z.number().int(),
  description: z.string(),
  tnc: z.string(),
  waTemplateId: z.string().optional(),
  expireAt: z.date().optional().nullable(),
  rewardType: z.nativeEnum(RewardTypes),
  rewardValue: z.object({
    value: z.any(),
    amount: z.number().optional(),
  }),
});

const byLRewardIdParamSchema = z.object({
  rewardId: z.string(),
});

const lRewardUpdateSchema = lRewardSchema.partial();

export const { schemas: loyaltyRewardSchemas, $ref: $lRewardRef } =
  buildJsonSchemas(
    {
      lRewardSchema,
      byLRewardIdParamSchema,
      lRewardUpdateSchema,
    },
    {
      $id: "loyaltyRewardSchema",
    },
  );

export type loyaltyRewardInput = z.infer<typeof lRewardSchema>;
export type lRewardIdParamInput = z.infer<typeof byLRewardIdParamSchema>;
export type lRewardUpdateInput = z.infer<typeof lRewardUpdateSchema>;

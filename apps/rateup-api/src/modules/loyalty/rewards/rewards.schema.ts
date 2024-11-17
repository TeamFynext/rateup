import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

const lRewardSchema = z.object({
  name: z.string(),
  points: z.number().int(),
  maxPerUser: z.number().int(),
  description: z.string(),
  tnc: z.string(),
});

const byLRewardIdParamSchema = z.object({
  rewardId: z.string(),
});

const lRewardUpdateSchema = z.object({
  name: z.string().optional(),
  points: z.number().int().optional(),
  maxPerUser: z.number().int().optional(),
  description: z.string().optional(),
  tnc: z.string().optional(),
});

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
export type lRewardIdUpdateInput = z.infer<typeof lRewardUpdateSchema>;

import { LcReward } from "@prisma/client";
import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { CampaignRewardType } from "../../../../types/enums";

export const byRewardIdParamsSchema = z.object({
  rewardId: z.string(),
});

export const LCRewardSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.date(),
  type: z.nativeEnum(CampaignRewardType),
  fixedAmount: z.number().optional(),
  percentage: z.number().optional(),
  maxPointsPerTransaction: z.number().optional(),
  orgId: z.string(),
});

export const { schemas: lcRewardSchemas, $ref: $lcRewardRef } =
  buildJsonSchemas(
    {
      byRewardIdParamsSchema,
      LCRewardSchema,
    },
    {
      $id: "loyaltyReward",
    },
  );

export type ByRewardIdParams = z.infer<typeof byRewardIdParamsSchema>;
// TODO: define zod schema for below & add to route validation
export type CreateRewardInput = Omit<LcReward, "id" | "createdAt">;
export type UpdateRewardInput = Partial<CreateRewardInput>;

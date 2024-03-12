import { LcReward } from "@prisma/client";
import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const byRewardIdParamsSchema = z.object({
  rewardId: z.string(),
});

export const { schemas: lcRewardSchemas, $ref: $lcRewardRef } =
  buildJsonSchemas(
    {
      byRewardIdParamsSchema,
    },
    {
      $id: "loyaltyReward",
    },
  );

export type ByRewardIdParams = z.infer<typeof byRewardIdParamsSchema>;
// TODO: define zod schema for below & add to route validation
export type CreateRewardInput = Omit<LcReward, "id" | "createdAt">;
export type UpdateRewardInput = Partial<CreateRewardInput>;

import { buildJsonSchemas } from "fastify-zod";
import {
  LCRewardSchema,
  byRewardIdParamsSchema,
} from "../../../../loyalty/internal/reward/reward.schema";

const createLCRewardSchema = LCRewardSchema.omit({
  id: true,
  createdAt: true,
  orgId: true,
});
export const { schemas: extLRewardSchemas, $ref: $extLRewardRef } =
  buildJsonSchemas(
    {
      LCRewardSchema,
      byRewardIdParamsSchema,
      createLCRewardSchema,
    },
    {
      $id: "extLReward",
    },
  );

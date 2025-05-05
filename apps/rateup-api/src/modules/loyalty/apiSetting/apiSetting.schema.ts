import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

const LApiSettingSchema = z.object({
  phoneKey: z.string(),
  amountKey: z.string(),
  actionId: z.string().optional(),
  rewardId: z.string().optional(),
  rules: z.object({
    fields: z.array(
      z.object({
        key: z.string(),
        value: z.string(),
      }),
    ),
  }),
  feature: z.enum(["action", "reward"]),
  priority: z.number(),
  active: z.boolean().optional(),
});

const updateApiSetting = LApiSettingSchema.partial();

const byLApiSettingIdParamSchema = z.object({
  id: z.string(),
});

export const { schemas: loyaltyApiSettingSchemas, $ref: $lApiSettingRef } =
  buildJsonSchemas(
    {
      byLApiSettingIdParamSchema,
      LApiSettingSchema,
      updateApiSetting,
    },
    {
      $id: "loyaltyApiSettingSchema",
    },
  );
export type LApiSettingIdInput = z.infer<typeof byLApiSettingIdParamSchema>;
export type LApiSettingInput = z.infer<typeof LApiSettingSchema>;
export type UpdateApiSettingInput = z.infer<typeof updateApiSetting>;

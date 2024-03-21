import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const createWaSettingsInput = {
  accessToken: z.string(),
  businessId: z.string(),
  phoneId: z.string(),
  webhookPassword: z.string(),
  appId: z.string(),
};
const createWaSettingsInputSchema = z.object(createWaSettingsInput);

const updateWaSettingsInputSchema = z.object({
  accessToken: z.string().optional(),
  businessId: z.string().optional(),
  phoneId: z.string().optional(),
  webhookPassword: z.string().optional(),
  appId: z.string().optional(),
  encryption: z
    .object({
      publicKey: z.string().optional(),
      privateKey: z.string().optional(),
    })
    .optional()
    .nullable(),
});
export const { schemas: waSettingsSchema, $ref: $WASettingsref } =
  buildJsonSchemas(
    {
      createWaSettingsInputSchema,
      updateWaSettingsInputSchema,
    },
    { $id: "waSettingsSchema" },
  );
export type createWaSettingsInput = z.infer<typeof createWaSettingsInputSchema>;
export type updateWaSettingsInput = z.infer<typeof updateWaSettingsInputSchema>;

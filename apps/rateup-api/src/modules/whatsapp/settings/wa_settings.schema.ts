import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { WaConfigType } from "../../../types/enums";

const createWaSettingsInput = {
  accessToken: z.string(),
  wabaId: z.string(),
  phoneId: z.string(),
  appId: z.string(),
  webhookPassword: z.string(),
};
const createWaSettingsInputSchema = z.object(createWaSettingsInput);

const updateWaSettingsInputSchema = z.object({
  accessToken: z.string().optional(),
  encryption: z
    .object({
      publicKey: z.string().optional(),
      privateKey: z.string().optional(),
    })
    .optional()
    .nullable(),
  wabaId: z.string().optional(),
  phoneId: z.string().optional(),
  appId: z.string().optional(),
  webhookPassword: z.string().optional(),
});

const getWaSettingsResponseSchema = z.object({
  phone: z.string(),
  wabaId: z.string(),
  appId: z.string(),
  phoneId: z.string(),
  webhookPassword: z.string().optional(),
  accessToken: z.string(),
  type: z.nativeEnum(WaConfigType),
});

export const { schemas: waSettingsSchema, $ref: $WASettingsref } =
  buildJsonSchemas(
    {
      createWaSettingsInputSchema,
      updateWaSettingsInputSchema,
      getWaSettingsResponseSchema,
    },
    { $id: "waSettingsSchema" },
  );
export type createWaSettingsInput = z.infer<typeof createWaSettingsInputSchema>;
export type updateWaSettingsInput = z.infer<typeof updateWaSettingsInputSchema>;

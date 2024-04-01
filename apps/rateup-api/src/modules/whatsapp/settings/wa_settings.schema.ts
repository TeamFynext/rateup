import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const createWaSettingsInput = {
  accessToken: z.string(),
  wabaId: z.string(),
  phoneId: z.string(),
  phone: z.string(),
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
});

const getWaSettingsResponseSchema = z.object({
  phone: z.string(),
  wabaId: z.string(),
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

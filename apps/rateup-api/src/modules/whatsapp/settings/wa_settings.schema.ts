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
enum sortOrder {
  asc = "asc",
  desc = "desc",
}
const createWaSettingsInputSchema = z.object(createWaSettingsInput);
export const paginationQuery = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  desc: z.nativeEnum(sortOrder).optional(),
  phone: z.string().optional().nullable(),
});

const updateWaSettingsInputSchema = z.object({
  accessToken: z.string().optional(),
  encryption: z
    .object({
      publicKey: z.string().optional(),
      privateKey: z.string().optional(),
      passphrase: z.string().optional(),
    })
    .optional()
    .nullable(),
  wabaId: z.string().optional(),
  phoneId: z.string().optional(),
  appId: z.string().optional(),
  webhookPassword: z.string().optional(),
});

const getWaSettingsResponseSchema = z.array(
  z.object({
    phone: z.string(),
    wabaId: z.string(),
    appId: z.string(),
    phoneId: z.string(),
    webhookPassword: z.string().optional(),
    accessToken: z.string(),
    type: z.nativeEnum(WaConfigType),
  }),
);
const contactTagSchema = z.object({
  tags: z.array(z.string()),
});
const byWaSettingsIdParamsSchema = z.object({
  phoneId: z.string(),
});

export const { schemas: waSettingsSchema, $ref: $WASettingsref } =
  buildJsonSchemas(
    {
      createWaSettingsInputSchema,
      updateWaSettingsInputSchema,
      getWaSettingsResponseSchema,
      contactTagSchema,
      paginationQuery,
      byWaSettingsIdParamsSchema,
    },
    { $id: "waSettingsSchema" },
  );
export type createWaSettingsInput = z.infer<typeof createWaSettingsInputSchema>;
export type updateWaSettingsInput = z.infer<typeof updateWaSettingsInputSchema>;
export type ContactTagSchema = z.infer<typeof contactTagSchema>;
export type PaginationQuery = z.infer<typeof paginationQuery>;
export type ByWaSettingsIdParamsSchema = z.infer<
  typeof byWaSettingsIdParamsSchema
>;

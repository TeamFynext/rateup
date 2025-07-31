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
  fbPageId: z.string().optional(),
  pageAccessToken: z.string().optional(),
  ibaId: z.string().optional(),
});

const whatsappSettingsIdParamSchema = z.object({
  whatsappSettingsId: z.string(),
});

const getWaSettingsResponseSchema = z.array(
  z.object({
    id: z.string(),
    phone: z.string(),
    wabaId: z.string(),
    appId: z.string(),
    phoneId: z.string(),
    webhookPassword: z.string().optional(),
    accessToken: z.string(),
    type: z.nativeEnum(WaConfigType),
    fbPageId: z.string().optional(),
    ibaId: z.string().optional(),
    pageAccessToken: z.string().optional(),
    igUserName: z.string().optional(),
  }),
);
const contactTagSchema = z.object({
  tags: z.array(z.string()),
});
const byWaSettingsIdParamsSchema = z.object({
  phoneId: z.string(),
});
const byLeadGenFormIdParamsSchema = z.object({
  formId: z.string(),
});
const byAdAccountIdParamsSchema = z.object({
  adAccountId: z.string(),
});
const byFbPageQuerySchema = z.object({
  fbPageId: z.string(),
  pageAccessToken: z.string(),
  fields: z.array(z.string()).optional(),
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
      byLeadGenFormIdParamsSchema,
      byFbPageQuerySchema,
      byAdAccountIdParamsSchema,
      whatsappSettingsIdParamSchema,
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
export type ByLeadGenFormIdParamsSchema = z.infer<
  typeof byLeadGenFormIdParamsSchema
>;
export type ByFbPageQuerySchema = z.infer<typeof byFbPageQuerySchema>;
export type ByAdAccountIdParamsSchema = z.infer<
  typeof byAdAccountIdParamsSchema
>;
export type whatsappSettingsIdParamSchema = z.infer<
  typeof whatsappSettingsIdParamSchema
>;

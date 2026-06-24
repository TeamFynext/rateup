import { z } from "zod";
import { WaConfigType } from "../../../types/enums.js";

const createWaSettingsInput = {
  accessToken: z.string(),
  wabaId: z.string(),
  phoneId: z.string(),
  appId: z.string(),
  webhookPassword: z.string(),
  conversionsApiDatasetId: z.string().optional().nullable(),
  conversionData: z.any().optional().nullable(),
};
enum sortOrder {
  asc = "asc",
  desc = "desc",
}
const createWaSettingsInputSchema = z.object(createWaSettingsInput);
const paginationQuery = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  desc: z.enum(sortOrder).optional(),
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
  webhookPassword: z.string().optional().nullable(),
  fbPageId: z.string().optional().nullable(),
  pageAccessToken: z.string().optional().nullable(),
  ibaId: z.string().optional().nullable(),
  igUserName: z.string().optional().nullable(),
  igDisplayName: z.string().optional().nullable(),
  instagramIceBreakers: z
    .array(
      z.object({
        question: z.string(),
        payload: z.string(),
      }),
    )
    .optional()
    .nullable(),
  instagramPersistentMenu: z
    .array(
      z.object({
        locale: z.string(),
        call_to_actions: z.array(
          z.object({
            type: z.enum(["postback", "web_url"]),
            title: z.string(),
            payload: z.string().optional(),
            url: z.string().optional(),
          }),
        ),
      }),
    )
    .optional()
    .nullable(),
  phoneDisplayName: z.string().optional().nullable(),
  fbUserName: z.string().optional().nullable(),
  conversionsApiDatasetId: z.string().optional().nullable(),
  conversionData: z.any().optional().nullable(),
  paymentMethod: z.string().optional(),
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
    type: z.enum(WaConfigType),
    fbPageId: z.string().optional().nullable(),
    ibaId: z.string().optional().nullable(),
    pageAccessToken: z.string().optional().nullable(),
    igUserName: z.string().optional().nullable(),
    igDisplayName: z.string().optional().nullable(),
    instagramIceBreakers: z
      .array(
        z.object({
          question: z.string(),
          payload: z.string(),
        }),
      )
      .optional()
      .nullable(),
    instagramPersistentMenu: z
      .array(
        z.object({
          locale: z.string(),
          call_to_actions: z.array(
            z.object({
              type: z.enum(["postback", "web_url"]),
              title: z.string(),
              payload: z.string().optional(),
              url: z.string().optional(),
            }),
          ),
        }),
      )
      .optional()
      .nullable(),
    phoneDisplayName: z.string().optional().nullable(),
    fbUserName: z.string().optional().nullable(),
    assets: z.array(z.string()),
    conversionsApiDatasetId: z.string().optional().nullable(),
    conversionData: z.any().optional().nullable(),
    paymentMethod: z.string().optional(),
  }),
);
const contactTagSchema = z.object({
  tags: z.array(z.string()),
  groupTags: z.array(z.string()),
  inboxLabels: z.array(
    z.object({
      name: z.string(),
      color: z.string(),
      description: z.string().optional(),
    }),
  ),
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

const conversationalAutomationCommandSchema = z.object({
  command_name: z.string().max(32),
  command_description: z.string().max(256),
});

const conversationalAutomationSchema = z.object({
  commands: z.array(conversationalAutomationCommandSchema).max(30).optional(),
  prompts: z.array(z.string().max(80)).max(4).optional(),
});

export type ConversationalAutomationInput = z.infer<
  typeof conversationalAutomationSchema
>;

// Auto-exported after fastify-zod migration
export {
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
  conversationalAutomationSchema,
};

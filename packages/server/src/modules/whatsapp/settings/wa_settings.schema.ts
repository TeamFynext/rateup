import { z } from "zod";
import { WaConfigType } from "../../../types/enums.js";

const createWaSettingsInput = {
  accessToken: z.string(),
  wabaId: z.string(),
  phoneId: z.string(),
  appId: z.string(),
  webhookPassword: z.string(),
  conversionsApiDatasetId: z.string().optional().nullable(),
  conversionData: z
    .object({
      event_name: z.string().optional(),
      currency: z.string().optional(),
    })
    .optional()
    .nullable(),
};
enum sortOrder {
  asc = "asc",
  desc = "desc",
}
const createWaSettingsInputSchema = z.object(createWaSettingsInput);
const paginationQuery = z.object({
  page: z.coerce.number().int().min(0).optional().default(0),
  limit: z.coerce.number().int().positive().optional(),
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
  // Messenger/Instagram fields are gone: those channels live on MetaChannel
  // (/api/meta/channels) and are no longer written through a WhatsApp channel.
  phoneDisplayName: z.string().optional().nullable(),
  conversionsApiDatasetId: z.string().optional().nullable(),
  conversionData: z
    .object({
      event_name: z.string().optional(),
      currency: z.string().optional(),
    })
    .optional()
    .nullable(),
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
    conversionData: z
      .object({
        event_name: z.string().optional(),
        currency: z.string().optional(),
      })
      .optional()
      .nullable(),
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
export type ByWaSettingsIdParamsSchema = z.infer<typeof byWaSettingsIdParamsSchema>;
export type ByLeadGenFormIdParamsSchema = z.infer<typeof byLeadGenFormIdParamsSchema>;
export type ByFbPageQuerySchema = z.infer<typeof byFbPageQuerySchema>;
export type ByAdAccountIdParamsSchema = z.infer<typeof byAdAccountIdParamsSchema>;
export type whatsappSettingsIdParamSchema = z.infer<typeof whatsappSettingsIdParamSchema>;

const conversationalAutomationCommandSchema = z.object({
  command_name: z.string().max(32),
  command_description: z.string().max(256),
});

const conversationalAutomationSchema = z.object({
  commands: z.array(conversationalAutomationCommandSchema).max(30).optional(),
  prompts: z.array(z.string().max(80)).max(4).optional(),
});

export type ConversationalAutomationInput = z.infer<typeof conversationalAutomationSchema>;

/**
 * A display name change request. Meta reviews the name against its display name
 * guidelines, so this only submits it — the number keeps its current name until the
 * review is approved and the number is re-registered.
 */
const updateDisplayNameSchema = z.object({
  newDisplayName: z.string().trim().min(1).max(200),
});

export type UpdateDisplayNameInput = z.infer<typeof updateDisplayNameSchema>;

/**
 * Meta's `WhatsAppVertical` values, minus `UNDEFINED` and `NOT_A_BIZ`, which the profile
 * API does not accept on write.
 */
const businessVerticals = [
  "OTHER",
  "AUTO",
  "BEAUTY",
  "APPAREL",
  "EDU",
  "ENTERTAIN",
  "EVENT_PLAN",
  "FINANCE",
  "GROCERY",
  "GOVT",
  "HOTEL",
  "HEALTH",
  "NONPROFIT",
  "PROF_SERVICES",
  "RETAIL",
  "TRAVEL",
  "RESTAURANT",
] as const;

/** Field limits are Meta's own; `address` is freeform text and is not validated against a map. */
const businessProfileSchema = z.object({
  about: z.string().max(139).optional(),
  address: z.string().max(256).optional(),
  description: z.string().max(512).optional(),
  email: z.string().max(128).optional(),
  websites: z.array(z.string().max(256)).max(2).optional(),
  vertical: z.enum(businessVerticals).optional(),
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

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
  updateDisplayNameSchema,
  businessProfileSchema,
};

import z from "zod";

const byNameSchema = z.object({
  name: z.string(),
});

const byIdSchema = z.object({
  id: z.string(),
});
enum Providers {
  razorpay = "razorpay",
  payu = "payu",
  zaakpay = "zaakpay",
}

const waPaymentCreateSchema = z.object({
  configuration_name: z
    .string()
    .min(4, "configuration_name must be at least 4 characters long")
    .max(40, "configuration_name must be at most 40 characters long")
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "configuration_name can only contain alphanumeric characters, periods, hyphens, and underscores",
    )
    .regex(/^\S*$/, "configuration_name cannot contain spaces"),
  purpose_code: z.string().min(1),
  merchant_category_code: z.string().min(1),
  provider_name: z.enum(Providers),
});

const integrationSchema = z.object({
  //for amelia
  // credential: z.object({
  //   apiKey: z.string(),
  //   baseUrl: z.string().url(),
  //   serviceId: z.number(),
  // }),
  credential: z.record(z.string(), z.any()),
  name: z.string(),
});

const updateIntgrationSchema = z.object({
  credential: z.record(z.string(), z.any()).optional(),
  active: z.boolean().optional(),
  updateKey: z.boolean().optional(),
});

const deleteZapierHookSchema = z.object({
  hookUrl: z.string().min(1),
});

/** What the frontend's generic OAuth callback page posts back. */
/** A pasted-key connect form; each provider validates its own fields. */
const apiKeyConnectSchema = z.record(z.string(), z.string());

/** Choices made before connecting that shape the consent request — Zoho's `products`. */
const oauthAuthorizeQuerySchema = z.record(z.string(), z.string());

const oauthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export type ByNameParams = z.infer<typeof byNameSchema>;

export type ByIdParams = z.infer<typeof byIdSchema>;

export type IntegrationSchema = z.infer<typeof integrationSchema>;

export type UpdateIntgrationInput = z.infer<typeof updateIntgrationSchema>;

export type WaPaymentCreateSchema = z.infer<typeof waPaymentCreateSchema>;

export type DeleteZapierHookInput = z.infer<typeof deleteZapierHookSchema>;

export type ApiKeyConnectInput = z.infer<typeof apiKeyConnectSchema>;

export type OAuthAuthorizeQuery = z.infer<typeof oauthAuthorizeQuerySchema>;

export type OAuthCallbackInput = z.infer<typeof oauthCallbackSchema>;

// Auto-exported after fastify-zod migration
export {
  byNameSchema,
  byIdSchema,
  integrationSchema,
  updateIntgrationSchema,
  waPaymentCreateSchema,
  deleteZapierHookSchema,
  apiKeyConnectSchema,
  oauthAuthorizeQuerySchema,
  oauthCallbackSchema,
};

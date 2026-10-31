import z from "zod";

import { pageSchema, paginationQuerySchema } from "../pagination.js";
import { phoneSchema, wirePhoneSchema } from "../phone.js";

/**
 * The public shape of a contact, shared by every module that returns one (contacts,
 * contact-groups). Built by `presentContact` in ./presenters.ts.
 */
export const contactSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  /** Digits, country code first, no `+`. */
  phone: wirePhoneSchema.nullable(),
  /**
   * WhatsApp's business-scoped user ID. A customer with a WhatsApp username can reach the
   * business with this and no phone; a template can be sent to it in place of a phone.
   */
  businessScopedUserId: z
    .string()
    .nullable()
    .describe(
      "WhatsApp business-scoped user ID (BSUID), e.g. US.13491208655302741918. Send to it as `phone` when the contact has no phone number",
    ),
  whatsappUsername: z
    .string()
    .nullable()
    .describe("The customer's WhatsApp (or Instagram) username, when known"),
  email: z.string().nullable(),
  externalId: z.string().nullable(),
  source: z.string().nullable(),
  consent: z.boolean(),
  labels: z.array(z.object({ id: z.string(), name: z.string() })),
  /** Keyed by the custom field's slug. */
  customFields: z.record(z.string(), z.string()),
  createdAt: z.iso.datetime(),
});

export type ContactView = z.infer<typeof contactSchema>;

// ---- requests -----------------------------------------------------------------------------

/** The most contacts one `POST /contacts/bulk` may carry. */
export const MAX_BULK_CONTACTS = 1000;
const MAX_CUSTOM_FIELDS = 100;
const MAX_LABELS = 100;

export const contactIdParamsSchema = z.object({ contactId: z.uuid() });

export const contactListQuerySchema = paginationQuerySchema.extend({
  search: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe("Case-insensitive match on name, email or phone digits"),
  labelId: z.uuid().optional().describe("Only contacts carrying this label"),
  contactGroupId: z.uuid().optional().describe("Only members of this audience"),
});

export const contactLookupQuerySchema = z.object({ phone: phoneSchema });

const nameField = z.string().trim().min(1).max(200);
const emailField = z.email().max(320);
const externalIdField = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .describe("Your own id for the contact; unique within the org");

function customFieldsOf<V extends z.ZodType>(value: V) {
  return z
    .record(z.string().min(1).max(100), value)
    .refine((o) => Object.keys(o).length <= MAX_CUSTOM_FIELDS, {
      message: `At most ${MAX_CUSTOM_FIELDS} custom fields`,
    })
    .describe("Keyed by the custom field's slug (Settings → Contacts → Custom fields)");
}

const labelsField = z
  .array(z.uuid())
  .max(MAX_LABELS)
  .describe("Label ids; every one must belong to the org");

export const createContactBodySchema = z.object({
  phone: phoneSchema,
  name: nameField.optional(),
  email: emailField.optional(),
  externalId: externalIdField.optional(),
  customFields: customFieldsOf(z.string().max(5000)).optional(),
  labels: labelsField.optional(),
});

export const bulkCreateContactsBodySchema = z.object({
  contacts: z.array(createContactBodySchema).min(1).max(MAX_BULK_CONTACTS),
});

export const updateContactBodySchema = z
  .object({
    name: nameField.optional(),
    phone: phoneSchema.optional(),
    email: emailField.nullable().optional().describe("null clears it"),
    externalId: externalIdField.nullable().optional().describe("null clears it"),
    customFields: customFieldsOf(z.string().max(5000).nullable())
      .optional()
      .describe("Merged into the contact's values; a null value removes that field"),
    labels: labelsField.optional().describe("Replaces the contact's labels; [] removes them all"),
  })
  .refine((body) => Object.values(body).some((v) => v !== undefined), {
    message: "Send at least one field to change",
  });

// ---- responses ----------------------------------------------------------------------------

export const contactListSchema = pageSchema(contactSchema);

const bulkSkipReasonSchema = z.enum(["already_exists", "duplicate_in_request"]);

export const bulkCreateContactsResultSchema = z.object({
  created: z.array(contactSchema),
  skipped: z.array(
    z.object({
      /** Position in the request's `contacts` array. */
      index: z.number().int(),
      phone: wirePhoneSchema,
      reason: bulkSkipReasonSchema,
    }),
  ),
});

export const contactDeletedSchema = z.object({ id: z.string(), deleted: z.literal(true) });

export type ContactIdParams = z.infer<typeof contactIdParamsSchema>;
export type ContactListQuery = z.infer<typeof contactListQuerySchema>;
export type ContactLookupQuery = z.infer<typeof contactLookupQuerySchema>;
export type CreateContactBody = z.infer<typeof createContactBodySchema>;
export type BulkCreateContactsBody = z.infer<typeof bulkCreateContactsBodySchema>;
export type UpdateContactBody = z.infer<typeof updateContactBodySchema>;
export type BulkSkipReason = z.infer<typeof bulkSkipReasonSchema>;

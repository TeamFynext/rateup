import z from "zod";

import { ContactIdentityKind, ContactIdentitySource } from "../../../../generated/prisma/enums.js";
import type { MergeChoosableField } from "../../../modules/contact/merge/merge.types.js";
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

/**
 * One way a contact is known: a phone, an email, a WhatsApp business-scoped user ID (BSUID),
 * an Instagram or Messenger id, a webchat visitor, or an id in another system. A contact can
 * hold any number of each; `primary` marks the one shown as the contact's `phone`, `email` or
 * `businessScopedUserId`.
 */
export const contactIdentitySchema = z.object({
  id: z.string(),
  kind: z.enum(ContactIdentityKind),
  /** PHONE: digits with the country code, no `+`. EMAIL: lowercased. Others: verbatim. */
  value: z.string(),
  channelId: z
    .string()
    .nullable()
    .describe(
      "IG_SCOPED, FB_PSID and WEBCHAT ids belong to one channel (the Instagram account, Page or widget); for other kinds, the channel this identity was last seen on",
    ),
  integration: z
    .string()
    .nullable()
    .describe("EXTERNAL only: the system the id belongs to, e.g. `shopify` or `my-crm`"),
  source: z.enum(ContactIdentitySource),
  verified: z
    .boolean()
    .describe("Issued by the platform or proven by the customer, as opposed to typed in"),
  primary: z.boolean(),
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  lastSeenAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export type ContactIdentityView = z.infer<typeof contactIdentitySchema>;

/** A single contact with its identities: what `GET /contacts/{id}`, lookup and merge return. */
export const contactDetailSchema = contactSchema.extend({
  identities: z.array(contactIdentitySchema),
});

export type ContactDetailView = z.infer<typeof contactDetailSchema>;

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

export const contactLookupQuerySchema = z
  .object({
    phone: phoneSchema
      .optional()
      .describe("Shorthand for `kind=PHONE&value=…`. Digits with the country code, no `+`"),
    kind: z.enum(ContactIdentityKind).optional().describe("Which kind of identity `value` is"),
    value: z.string().trim().min(1).max(320).optional(),
    channelId: z
      .uuid()
      .optional()
      .describe("IG_SCOPED, FB_PSID, WEBCHAT: only an id recorded on this channel"),
    integration: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional()
      .describe("EXTERNAL: only an id from this integration"),
  })
  .refine(
    (q) =>
      q.phone !== undefined
        ? q.kind === undefined && q.value === undefined
        : q.kind !== undefined && q.value !== undefined,
    { message: "Send either `phone`, or `kind` and `value`" },
  );

/** Kinds a partner may add. Platform ids (BSUID, Instagram, Messenger, webchat) only come from the platform. */
export const ADDABLE_IDENTITY_KINDS = [
  ContactIdentityKind.PHONE,
  ContactIdentityKind.EMAIL,
  ContactIdentityKind.EXTERNAL,
] as const;

const integrationKeyField = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_.:-]+$/, "Letters, digits and _ . : - only");

export const addContactIdentityBodySchema = z
  .object({
    kind: z.enum(ADDABLE_IDENTITY_KINDS),
    value: z.string().trim().min(1).max(320),
    integration: integrationKeyField
      .optional()
      .describe("Required for EXTERNAL: the system the id belongs to, e.g. `shopify`"),
  })
  .superRefine((body, ctx) => {
    if (body.kind === ContactIdentityKind.EXTERNAL && !body.integration) {
      ctx.addIssue({ code: "custom", path: ["integration"], message: "Required for EXTERNAL" });
    }
    if (body.kind !== ContactIdentityKind.EXTERNAL && body.integration !== undefined) {
      ctx.addIssue({ code: "custom", path: ["integration"], message: "Only for EXTERNAL" });
    }
  });

export const contactIdentityParamsSchema = z.object({
  contactId: z.uuid(),
  identityId: z.uuid(),
});

const mergeSide = z.enum(["source", "target"]);

export const mergeContactBodySchema = z.object({
  sourceContactId: z
    .uuid()
    .describe("The contact merged away. Everything it owns moves to the contact in the path"),
  fieldChoices: z
    .object({
      name: mergeSide.optional(),
      email: mergeSide.optional(),
      address: mergeSide.optional(),
      dob: mergeSide.optional(),
      gender: mergeSide.optional(),
      notes: mergeSide.optional(),
      lifecycleId: mergeSide.optional(),
      customFields: z
        .record(z.string().min(1).max(100), mergeSide)
        .optional()
        .describe("Keyed by the custom field's slug"),
    } satisfies Record<MergeChoosableField | "customFields", z.ZodType>)
    .strict()
    .optional()
    .describe(
      "Which side's value wins where both contacts have one and they differ. Default: the target's; a blank on the target is filled from the source",
    ),
});

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

export const contactIdentityListSchema = z.object({ data: z.array(contactIdentitySchema) });

export type ContactIdParams = z.infer<typeof contactIdParamsSchema>;
export type ContactListQuery = z.infer<typeof contactListQuerySchema>;
export type ContactLookupQuery = z.infer<typeof contactLookupQuerySchema>;
export type CreateContactBody = z.infer<typeof createContactBodySchema>;
export type BulkCreateContactsBody = z.infer<typeof bulkCreateContactsBodySchema>;
export type UpdateContactBody = z.infer<typeof updateContactBodySchema>;
export type BulkSkipReason = z.infer<typeof bulkSkipReasonSchema>;
export type AddContactIdentityBody = z.infer<typeof addContactIdentityBodySchema>;
export type ContactIdentityParams = z.infer<typeof contactIdentityParamsSchema>;
export type MergeContactBody = z.infer<typeof mergeContactBodySchema>;

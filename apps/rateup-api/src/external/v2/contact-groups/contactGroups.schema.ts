import z from "zod";

import { contactSchema } from "../contacts/contacts.schema.js";
import { pageSchema, paginationQuerySchema } from "../pagination.js";
import { phoneSchema, wirePhoneSchema } from "../phone.js";

/** Bulk bodies are bounded: one request is one transaction's worth of work, not an import job. */
const MAX_BULK = 1000;

export const contactGroupIdParamsSchema = z.object({
  contactGroupId: z.uuid().describe("The audience's id"),
});

const groupType = z.enum(["NORMAL", "LOYALTY"]);
const tags = z
  .record(z.string(), z.unknown())
  .describe("Free-form key/value metadata, as the dashboard stores it");

export const contactGroupListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(100).optional().describe("Case-insensitive name match"),
  teamId: z.uuid().optional(),
  type: groupType.optional(),
});

const contactGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  tags: tags.nullable(),
  teamId: z.string(),
  type: groupType,
  createdAt: z.iso.datetime(),
});

export const contactGroupDetailSchema = contactGroupSchema.extend({
  memberCount: z.number().int(),
});

export const createContactGroupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  teamId: z.uuid(),
  icon: z.string().max(100).optional(),
  tags: tags.optional(),
});

export const updateContactGroupSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    icon: z.string().max(100).nullable().optional(),
    tags: tags.nullable().optional(),
  })
  .refine((body) => Object.values(body).some((v) => v !== undefined), {
    message: "Send at least one field to change",
  });

export const contactIdsBodySchema = z.object({
  contactIds: z.array(z.uuid()).min(1).max(MAX_BULK),
});

export const addContactsResultSchema = z.object({
  /** Newly made members. */
  added: z.number().int(),
  /** Already in the group; not an error. */
  alreadyMembers: z.number().int(),
  /** Ids that are not contacts of this org. Nothing was done with them. */
  notFound: z.array(z.string()),
});

/** A 204 has no body. */
export const emptySchema = z.null().describe("No content");

export const removeContactsResultSchema = z.object({ removed: z.number().int() });

const importContactSchema = z.object({
  phone: phoneSchema,
  name: z.string().trim().max(200).optional(),
  email: z.email().optional(),
  externalId: z.string().trim().min(1).max(200).optional(),
  customFields: z
    .record(z.string(), z.string().max(2000))
    .optional()
    .describe("Keyed by the custom field's slug"),
});

export const importContactsBodySchema = z.object({
  contacts: z.array(importContactSchema).min(1).max(MAX_BULK),
});

export const importContactsResultSchema = z.object({
  /** Contacts that did not exist and were created. */
  created: z.number().int(),
  /** Contacts matched to an existing one by phone. Existing contacts are not modified. */
  existing: z.number().int(),
  /** Newly made group members (created or existing). */
  added: z.number().int(),
  alreadyMembers: z.number().int(),
  contacts: z.array(
    z.object({
      phone: wirePhoneSchema,
      contactId: z.string().nullable(),
      status: z.enum(["created", "existing", "failed"]),
      /** Set when `status` is `failed`, e.g. `external_id_conflict`. */
      reason: z.string().nullable(),
    }),
  ),
});

export const contactGroupListSchema = pageSchema(contactGroupSchema);
export const groupContactListSchema = pageSchema(contactSchema);

export type ContactGroupIdParams = z.infer<typeof contactGroupIdParamsSchema>;
export type ContactGroupListQuery = z.infer<typeof contactGroupListQuerySchema>;
export type CreateContactGroupBody = z.infer<typeof createContactGroupSchema>;
export type UpdateContactGroupBody = z.infer<typeof updateContactGroupSchema>;
export type ContactIdsBody = z.infer<typeof contactIdsBodySchema>;
export type ImportContactsBody = z.infer<typeof importContactsBodySchema>;

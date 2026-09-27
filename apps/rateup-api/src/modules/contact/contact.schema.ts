import { ContactGroupType } from "../../../generated/prisma/client.js";

import { z } from "zod";
import { ResolutionResult, WaMessageAssignStatus } from "../../types/enums.js";

/**
 * `Contact.lifecycleId` is a uuid FK, but form clients spell "no lifecycle" as `""` — which
 * Postgres rejects outright (22P02 `invalid input syntax for type uuid: ""`) rather than
 * treating as null. Normalise the blank here so the column only ever sees a uuid or null.
 *
 * `.optional()` sits outside the transform so an omitted field stays `undefined`: a partial update
 * (an inbox status change, say) leaves the field out, and collapsing that to null would clear the
 * contact's lifecycle.
 */
const optionalLifecycleId = z
  .union([z.uuid(), z.literal(""), z.null()])
  .transform((value) => value || null)
  .optional();

/**
 * A form client sends `""` for a field the user emptied, which is a clear, not the literal empty
 * string. It matters most for `external_id`: it is half of `@@unique([external_id, orgId])`, so a
 * stored `""` collides with the next contact whose id is also blank.
 */
const clearableText = z
  .union([z.string(), z.null()])
  .transform((value) => (value ? value : null))
  .optional();

/** Bodies are JSON, so a date arrives as an ISO string rather than a `Date`. */
const clearableDate = z.coerce.date().nullable().optional();

const contactCoreSchema = z.object({
  name: z.string(),
  phone: z.string().optional(),
  customFields: z
    .array(
      z.object({
        id: z.string().optional(),
        value: z.string(),
      }),
    )
    .optional(),
  source: z.string(),
  email: z.string().optional(),
  address: clearableText,
  dob: clearableDate,
  external_id: z.string().optional(),
  igsId: z.string().optional(),
  psid: z.string().optional(),
  labels: z.array(z.uuid()).optional(),
  contactGroupIds: z.array(z.string()).optional(),
  assignedUserIds: z.array(z.string()).optional(),
  lifecycleId: optionalLifecycleId,
  notes: z.string().optional(),
});

const createMultipleContactSchema = z.array(contactCoreSchema);

const bulkUpdateContactStatusSchema = z.object({
  contactIds: z.array(z.uuid()),
  waMessageAssignStatus: z.enum(WaMessageAssignStatus),
  messageId: z.string().optional(), // for internal messages
  // Nullable as well as optional: closing without picking a result sends an
  // explicit null, and reopening sends null to clear the previous one.
  resolutionResult: z.enum(ResolutionResult).nullish(), // close-with-result taxonomy
});

const updateContactSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  customFields: z
    .array(
      z.object({
        id: z.string().optional(),
        value: z.string(),
      }),
    )
    .optional(),
  waMessageAssignStatus: z.enum(WaMessageAssignStatus).optional(),
  // The ticket a status change is for. A contact can hold several; without this the
  // newest one is changed, which is not the one on screen when an older ticket is open.
  conversationId: z.uuid().optional(),
  // Nullable as well as optional: closing without picking a result sends an
  // explicit null, and reopening sends null to clear the previous one.
  resolutionResult: z.enum(ResolutionResult).nullish(), // close-with-result taxonomy
  messageId: z.string().optional(), // for internal messages
  // Editable on the contact form, so they have to survive validation to reach the update.
  email: clearableText,
  address: clearableText,
  dob: clearableDate,
  external_id: clearableText,
  lastReceivedMessageTimeStamp: z.string().optional(),
  whatsappUserName: z.string().optional().nullable(),
  followerCount: z.number().optional().nullable(),
  isIgVerifiedUser: z.boolean().optional().nullable(),
  igsId: z.string().optional().nullable(),
  profilePic: z.string().optional().nullable(),
  source: z.string().optional(),
  lastMessageBody: z.any().optional(),
  lastMessageWaCreatedAt: z.string().optional().nullable(),
  lastMessagePlatform: z.string().optional().nullable(),
  lastReceivedMetadata: z.any().optional(),
  lastSentMessageTimeStamp: z.string().optional().nullable(),
  lastMessageSourceIdentifier: z.string().optional().nullable(),
  labels: z.array(z.uuid()).optional(),
  contactGroupIds: z.array(z.string()).optional(),
  assignedUserIds: z.array(z.string()).optional(),
  lifecycleId: optionalLifecycleId,
  integrationIds: z.any().optional(),
  notes: z.string().optional().nullable(),
});
const updateContactLabelsSchema = z.object({
  lifecycleId: z.string(),
});

const paginationQuery = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  desc: z.string().optional(),
  type: z.enum(ContactGroupType).optional(),
});

const byContactIdSchema = z.object({
  contactId: z.string(),
});

const deleteManyContactSchema = z.object({
  contactIds: z.array(z.string()),
});

const customFieldSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  visibility: z.boolean().default(true),
  type: z.enum(["text", "number", "email", "multivalue"]).default("text"),
  listValues: z.array(z.string()).optional(),
});

const byFieldIdSchema = z.object({
  fieldId: z.string(),
});

const assignLabelsToContactSchema = z.object({
  labelIds: z.array(z.uuid()),
});

export type ContactCore = z.infer<typeof contactCoreSchema>;
export type ByContactIdParams = z.infer<typeof byContactIdSchema>;
export type updateContactSchema = z.infer<typeof updateContactSchema>;
export type createMultipleContactInput = z.infer<typeof createMultipleContactSchema>;
export type deleteManyContactsInput = z.infer<typeof deleteManyContactSchema>;
export type PaginationQuery = z.infer<typeof paginationQuery>;
export type UpdateContactLabelsSchema = z.infer<typeof updateContactLabelsSchema>;
export type CustomFieldSchema = z.infer<typeof customFieldSchema>;
export type BulkUpdateContactStatusSchema = z.infer<typeof bulkUpdateContactStatusSchema>;

export type ByFieldIdSchema = z.infer<typeof byFieldIdSchema>;
export type AssignLabelsToContactSchema = z.infer<typeof assignLabelsToContactSchema>;

// Auto-exported after fastify-zod migration
export {
  byContactIdSchema,
  updateContactSchema,
  createMultipleContactSchema,
  deleteManyContactSchema,
  contactCoreSchema,
  paginationQuery,
  updateContactLabelsSchema,
  customFieldSchema,
  byFieldIdSchema,
  assignLabelsToContactSchema,
  bulkUpdateContactStatusSchema,
};

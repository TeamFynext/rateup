import { ContactGroupType } from "../../../generated/prisma/client.js";

import { z } from "zod";
import { WaMessageAssignStatus } from "../../types/enums.js";

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
  dob: z.date().optional().nullable(),
  external_id: z.string().optional(),
  aiWaChat: z.boolean().optional(),
  igsId: z.string().optional(),
  psid: z.string().optional(),
  labels: z.array(z.uuid()).optional(),
  contactGroupIds: z.array(z.string()).optional(),
  assignedUserIds: z.array(z.string()).optional(),
  lifecycleId: z.string().optional(),
  notes: z.string().optional(),
});

const createMultipleContactSchema = z.array(contactCoreSchema);

const bulkUpdateContactStatusSchema = z.object({
  contactIds: z.array(z.uuid()),
  waMessageAssignStatus: z.enum(WaMessageAssignStatus),
  messageId: z.string().optional(), // for internal messages
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
  aiWaChat: z.boolean().optional(),
  waMessageAssignStatus: z.enum(WaMessageAssignStatus).optional(),
  messageId: z.string().optional(), // for internal messages
  lastReceivedMessageTimeStamp: z.string().optional(),
  whatsappUserName: z.string().optional(),
  followerCount: z.number().optional(),
  isIgVerifiedUser: z.boolean().optional(),
  igsId: z.string().optional(),
  profilePic: z.string().optional(),
  source: z.string().optional(),
  lastMessageBody: z.any().optional(),
  lastMessageWaCreatedAt: z.string().optional(),
  lastMessagePlatform: z.string().optional(),
  lastReceivedMetadata: z.any().optional(),
  lastSentMessageTimeStamp: z.string().optional(),
  lastMessageSourceIdentifier: z.string().optional(),
  labels: z.array(z.uuid()).optional(),
  contactGroupIds: z.array(z.string()).optional(),
  assignedUserIds: z.array(z.string()).optional(),
  lifecycleId: z.string().optional(),
  integrationIds: z.any().optional(),
  notes: z.string().optional(),
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
export type createMultipleContactInput = z.infer<
  typeof createMultipleContactSchema
>;
export type deleteManyContactsInput = z.infer<typeof deleteManyContactSchema>;
export type PaginationQuery = z.infer<typeof paginationQuery>;
export type UpdateContactLabelsSchema = z.infer<
  typeof updateContactLabelsSchema
>;
export type CustomFieldSchema = z.infer<typeof customFieldSchema>;
export type BulkUpdateContactStatusSchema = z.infer<
  typeof bulkUpdateContactStatusSchema
>;

export type ByFieldIdSchema = z.infer<typeof byFieldIdSchema>;
export type AssignLabelsToContactSchema = z.infer<
  typeof assignLabelsToContactSchema
>;

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

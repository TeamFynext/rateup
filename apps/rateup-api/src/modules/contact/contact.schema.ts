import { ContactGroupType } from "../../../generated/prisma/client";
import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { WaMessageAssignStatus } from "../../types/enums";

export const contactCoreSchema = z.object({
  name: z.string(),
  phone: z.string().optional(),
  tags: z.any(),
  source: z.string(),
  email: z.string().optional(),
  dob: z.date().optional().nullable(),
  external_id: z.string().optional(),
  aiWaChat: z.boolean().optional(),
});

export const createMultipleContactSchema = z.array(contactCoreSchema);

const updateContactSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  tags: z.any(),
  aiWaChat: z.boolean().optional(),
  waMessageAssignStatus: z.nativeEnum(WaMessageAssignStatus).optional(),
  lastReceivedMessageTimeStamp: z.string().optional(),
});

export const paginationQuery = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  desc: z.string().optional(),
  type: z.nativeEnum(ContactGroupType).optional(),
});

const byContactIdSchema = z.object({
  contactId: z.string(),
});

const deleteManyContactSchema = z.object({
  contactIds: z.array(z.string()),
});

export const { schemas: contactSchemas, $ref: $contactRef } = buildJsonSchemas(
  {
    byContactIdSchema,
    updateContactSchema,
    createMultipleContactSchema,
    deleteManyContactSchema,
    contactCoreSchema,
    paginationQuery,
  },
  {
    $id: "contactSchema",
  },
);

export type ContactCore = z.infer<typeof contactCoreSchema>;
export type ByContactIdParams = z.infer<typeof byContactIdSchema>;
export type updateContactSchema = z.infer<typeof updateContactSchema>;
export type createMultipleContactInput = z.infer<
  typeof createMultipleContactSchema
>;
export type deleteManyContactsInput = z.infer<typeof deleteManyContactSchema>;
export type PaginationQuery = z.infer<typeof paginationQuery>;

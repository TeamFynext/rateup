import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

export const contactCoreSchema = z.object({
  name: z.string(),
  phone: z.string().optional(),
  tags: z.any(),
  source: z.string(),
});

export const createMultipleContactSchema = z.array(contactCoreSchema);

const updateContactSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  tags: z.any(),
});

const paginationQuery = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  desc: z.string().optional(),
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

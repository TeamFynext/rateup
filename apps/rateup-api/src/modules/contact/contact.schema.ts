import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const contactCoreSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string(),
});

export const createContactSchema = contactCoreSchema.extend({
  teamId: z.string(),
});

export const createMultipleContactSchema = z.array(createContactSchema);

const updateContactSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().optional(),
});

const byContactIdSchema = z.object({
  contactId: z.string(),
});
const getContactQuerySchema = z.object({
  teamId: z.string().optional(),
  contactId: z.string().optional(),
});

const deleteManyContactSchema = z.object({
  contactIds: z.array(z.string()),
});

export const { schemas: contactSchemas, $ref: $contactRef } = buildJsonSchemas(
  {
    createContactSchema,
    byContactIdSchema,
    updateContactSchema,
    getContactQuerySchema,
    createMultipleContactSchema,
    deleteManyContactSchema,
  },
  {
    $id: "contactSchema",
  },
);

export type GetContactQuery = z.infer<typeof getContactQuerySchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type ByContactIdParams = z.infer<typeof byContactIdSchema>;
export type updateContactSchema = z.infer<typeof updateContactSchema>;
export type createMultipleContactInput = z.infer<
  typeof createMultipleContactSchema
>;
export type deleteManyContactsInput = z.infer<typeof deleteManyContactSchema>;

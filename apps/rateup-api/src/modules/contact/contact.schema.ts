import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const contactCoreSchema = z.object({
    name: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
})

export const createContactSchema = contactCoreSchema.extend({
    teamId: z.string(),
})

const updateContactSchema = z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
})

const byContactIdSchema = z.object({
    contactId: z.string(),
})
const getContactQuerySchema = z.object({
    teamId: z.string().optional(),
    contactId: z.string().optional(),
})

export const { schemas: contactSchemas, $ref: $contactRef } = buildJsonSchemas({
    createContactSchema,
    byContactIdSchema,
    updateContactSchema,
    getContactQuerySchema,
}, {
    $id: 'contactSchema'
})

export type GetContactQuery = z.infer<typeof getContactQuerySchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type ByContactIdParams = z.infer<typeof byContactIdSchema>;
export type updateContactSchema = z.infer<typeof updateContactSchema>;
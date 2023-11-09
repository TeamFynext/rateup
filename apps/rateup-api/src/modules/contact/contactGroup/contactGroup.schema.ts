import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { createContactSchema } from "../contact.schema";

const coreContactGroupSchema = z.object({
    name: z.string(),
    icon: z.string().optional(),
});

const createContactGroupInputSchema = coreContactGroupSchema.extend({
    teamId: z.string(),
})

const updateContactGroupInputSchema = z.object({
    name: z.string().optional(),
    icon: z.string().optional(),
})

const byContactGroupIdParamsSchema = z.object({
    contactGroupId: z.string(),
})

const addExistingContactsToGroupInputSchema = z.object({
    contactIds: z.array(z.string()),
})

const getContactGroupsQuerySchema = z.object({
    contactGroupId: z.string().optional(),
    teamId: z.string().optional(),
})

const addNewContactsToGroupInputSchema = z.array(createContactSchema.omit({ teamId: true }))

export const { schemas: contactGroupSchemas, $ref: $contactGroupRef } = buildJsonSchemas({
    createContactGroupInputSchema,
    byContactGroupIdParamsSchema,
    updateContactGroupInputSchema,
    addExistingContactsToGroupInputSchema,
    addNewContactsToGroupInputSchema,
    getContactGroupsQuerySchema
}, {
    $id: 'contactGroupSchema'
})

export type GetContactGroupsQuery = z.infer<typeof getContactGroupsQuerySchema>;
export type AddExistingContactsToGroupInput = z.infer<typeof addExistingContactsToGroupInputSchema>;
export type AddNewContactsToGroupInput = z.infer<typeof addNewContactsToGroupInputSchema>;
export type ByContactGroupIdParams = z.infer<typeof byContactGroupIdParamsSchema>;
export type UpdateContactGroupInput = z.infer<typeof updateContactGroupInputSchema>;
export type CreateContactGroupInput = z.infer<typeof createContactGroupInputSchema>;
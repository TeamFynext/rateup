import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { contactCoreSchema } from "../contact.schema.js";

const coreContactGroupSchema = z.object({
  name: z.string(),
  icon: z.string().optional(),
});

const createContactGroupInputSchema = coreContactGroupSchema.extend({
  teamId: z.string(),
});

const updateContactGroupInputSchema = z.object({
  name: z.string().optional(),
  icon: z.string().optional(),
});

const byContactGroupIdParamsSchema = z.object({
  contactGroupId: z.string(),
});
const byContactGroupIdWithOrgIdParamsSchema =
  byContactGroupIdParamsSchema.extend({
    orgId: z.string(),
  });

const addExistingContactsToGroupInputSchema = z.object({
  contactIds: z.array(z.string()),
});
const addExistingContactsToMultipleGroupsInputSchema =
  addExistingContactsToGroupInputSchema.extend({
    contactGroupIds: z.array(z.string()),
  });

const getContactGroupsQuerySchema = z.object({
  contactGroupId: z.string().optional(),
  teamId: z.string().optional(),
});

const removeGroupContactsSchema = z.array(z.string());

const addNewContactsToGroupInputSchema = z.array(contactCoreSchema);
const extAddNewContactsToGroupInputSchema = z.array(
  contactCoreSchema.omit({ source: true }),
);

const deleteManyGroupSchema = z.object({
  contactGroupIds: z.array(z.string()),
});

const contactGroupResponseSchema = coreContactGroupSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  teamId: z.string(),
});

export const { schemas: contactGroupSchemas, $ref: $contactGroupRef } =
  buildJsonSchemas(
    {
      createContactGroupInputSchema,
      byContactGroupIdParamsSchema,
      updateContactGroupInputSchema,
      addExistingContactsToGroupInputSchema,
      addNewContactsToGroupInputSchema,
      getContactGroupsQuerySchema,
      removeGroupContactsSchema,
      addExistingContactsToMultipleGroupsInputSchema,
      deleteManyGroupSchema,
      contactGroupResponseSchema,
      byContactGroupIdWithOrgIdParamsSchema,
      extAddNewContactsToGroupInputSchema,
    },
    {
      $id: "contactGroupSchema",
    },
  );

export type GetContactGroupsQuery = z.infer<typeof getContactGroupsQuerySchema>;
export type AddExistingContactsToGroupInput = z.infer<
  typeof addExistingContactsToGroupInputSchema
>;
export type AddExistingContactsToMultipleGroupsInput = z.infer<
  typeof addExistingContactsToMultipleGroupsInputSchema
>;
export type AddNewContactsToGroupInput = z.infer<
  typeof addNewContactsToGroupInputSchema
>;
export type ByContactGroupIdParams = z.infer<
  typeof byContactGroupIdParamsSchema
>;
export type UpdateContactGroupInput = z.infer<
  typeof updateContactGroupInputSchema
>;
export type CreateContactGroupInput = z.infer<
  typeof createContactGroupInputSchema
>;
export type RemoveGroupContactsSchema = z.infer<
  typeof removeGroupContactsSchema
>;
export type DeleteManyGroupsInput = z.infer<typeof deleteManyGroupSchema>;

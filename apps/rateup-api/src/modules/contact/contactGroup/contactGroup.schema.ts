import { z } from "zod";
import { contactCoreSchema } from "../contact.schema.js";

const coreContactGroupSchema = z.object({
  name: z.string(),
  icon: z.string().optional(),
  tags: z.any(),
});
export enum ContactGroupType {
  NORMAL = "NORMAL",
  LOYALTY = "LOYALTY",
}

const createContactGroupInputSchema = coreContactGroupSchema.extend({
  teamId: z.string(),
  type: z.enum(ContactGroupType),
});

const updateContactGroupInputSchema = z.object({
  name: z.string().optional(),
  icon: z.string().optional(),
  tags: z.any(),
});

const byContactGroupIdParamsSchema = z.object({
  contactGroupId: z.string(),
});
const paginationQuery = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  desc: z.string().optional(),
  phone: z.coerce.number().optional(),
  name: z.string().optional(),
  source: z.string().optional(),
  consent: z.string().optional(),
});
const byContactGroupIdWithOrgIdParamsSchema = byContactGroupIdParamsSchema.extend({
  orgId: z.string(),
});

const addExistingContactsToGroupInputSchema = z.object({
  contactIds: z.array(z.string()),
  isCustomer: z.boolean().optional(),
});
const addExistingContactsToMultipleGroupsInputSchema = addExistingContactsToGroupInputSchema.extend(
  {
    contactGroupIds: z.array(z.string()),
  },
);

const getContactGroupsQuerySchema = z.object({
  contactGroupId: z.string().optional(),
  teamId: z.string().optional(),
  type: z.enum(ContactGroupType).optional(),
  /** With `teamId`: report each group's member count for members reachable on this channel only. */
  contactChannel: z.string().optional(),
});

const removeGroupContactsSchema = z.array(z.string());

const addNewContactsToGroupInputSchema = z.array(contactCoreSchema);
const extAddNewContactsToGroupInputSchema = z.array(contactCoreSchema.omit({ source: true }));

const deleteManyGroupSchema = z.object({
  contactGroupIds: z.array(z.string()),
});

const contactGroupResponseSchema = coreContactGroupSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  teamId: z.string(),
});

const contactGroupByContactId = z.object({
  contactId: z.string(),
});

const contactGroupByContactIdBody = z.object({
  addGroupIds: z.array(z.string()).optional(),
  removeGroupIds: z.array(z.string()).optional(),
});

export type GetContactGroupsQuery = z.infer<typeof getContactGroupsQuerySchema>;
export type AddExistingContactsToGroupInput = z.infer<typeof addExistingContactsToGroupInputSchema>;
export type AddExistingContactsToMultipleGroupsInput = z.infer<
  typeof addExistingContactsToMultipleGroupsInputSchema
>;
export type AddNewContactsToGroupInput = z.infer<typeof addNewContactsToGroupInputSchema>;
export type ByContactGroupIdParams = z.infer<typeof byContactGroupIdParamsSchema>;
export type UpdateContactGroupInput = z.infer<typeof updateContactGroupInputSchema>;
export type CreateContactGroupInput = z.infer<typeof createContactGroupInputSchema>;
export type RemoveGroupContactsSchema = z.infer<typeof removeGroupContactsSchema>;
export type DeleteManyGroupsInput = z.infer<typeof deleteManyGroupSchema>;
export type PaginationQuery = z.infer<typeof paginationQuery>;
export type contactGroupByContactId = z.infer<typeof contactGroupByContactId>;
export type ContactGroupByContactIdBody = z.infer<typeof contactGroupByContactIdBody>;

// Auto-exported after fastify-zod migration
export {
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
  paginationQuery,
  contactGroupByContactId,
  contactGroupByContactIdBody,
};

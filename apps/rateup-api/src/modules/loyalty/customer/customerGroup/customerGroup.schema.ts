import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const customerCoreSchema = z.object({
  name: z.string(),
  phone: z.string().optional(),
  tags: z.any(),
  source: z.string(),
});

const coreCustomerGroupSchema = z.object({
  name: z.string(),
  icon: z.string().optional(),
});

const createCustomerGroupInputSchema = coreCustomerGroupSchema.extend({
  teamId: z.string(),
});

const updateCustomerGroupInputSchema = z.object({
  name: z.string().optional(),
  icon: z.string().optional(),
});

const byCustomerGroupIdParamsSchema = z.object({
  contactGroupId: z.string(),
});
const paginationQuery = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  desc: z.string().optional(),
  phone: z.number().optional(),
  name: z.string().optional(),
  source: z.string().optional(),
  consent: z.string().optional(),
});
const byCustomerGroupIdWithOrgIdParamsSchema =
  byCustomerGroupIdParamsSchema.extend({
    orgId: z.string(),
  });

const addExistingCustomersToGroupInputSchema = z.object({
  customerIds: z.array(z.string()),
});
const addExistingCustomersToMultipleGroupsInputSchema =
  addExistingCustomersToGroupInputSchema.extend({
    customerGroupIds: z.array(z.string()),
  });

const getCustomerGroupsQuerySchema = z.object({
  customerGroupId: z.string().optional(),
  teamId: z.string().optional(),
});

const removeGroupCustomersSchema = z.array(z.string());

const addNewCustomersToGroupInputSchema = z.array(customerCoreSchema);
const extAddNewCustomersToGroupInputSchema = z.array(
  customerCoreSchema.omit({ source: true }),
);

const deleteManyGroupSchema = z.object({
  customerGroupIds: z.array(z.string()),
});

const customerGroupResponseSchema = coreCustomerGroupSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  teamId: z.string(),
});

export const { schemas: customerGroupSchemas, $ref: $customerGroupRef } =
  buildJsonSchemas(
    {
      createCustomerGroupInputSchema,
      byCustomerGroupIdParamsSchema,
      updateCustomerGroupInputSchema,
      addExistingCustomersToGroupInputSchema,
      addNewCustomersToGroupInputSchema,
      getCustomerGroupsQuerySchema,
      removeGroupCustomersSchema,
      addExistingCustomersToMultipleGroupsInputSchema,
      deleteManyGroupSchema,
      customerGroupResponseSchema,
      byCustomerGroupIdWithOrgIdParamsSchema,
      extAddNewCustomersToGroupInputSchema,
      paginationQuery,
    },
    {
      $id: "customerGroupSchema",
    },
  );

export type GetCustomerGroupsQuery = z.infer<
  typeof getCustomerGroupsQuerySchema
>;
export type AddExistingCustomersToGroupInput = z.infer<
  typeof addExistingCustomersToGroupInputSchema
>;
export type AddExistingCustomersToMultipleGroupsInput = z.infer<
  typeof addExistingCustomersToMultipleGroupsInputSchema
>;
export type AddNewCustomersToGroupInput = z.infer<
  typeof addNewCustomersToGroupInputSchema
>;
export type ByCustomerGroupIdParams = z.infer<
  typeof byCustomerGroupIdParamsSchema
>;
export type UpdateCustomerGroupInput = z.infer<
  typeof updateCustomerGroupInputSchema
>;
export type CreateCustomerGroupInput = z.infer<
  typeof createCustomerGroupInputSchema
>;
export type RemoveGroupCustomersSchema = z.infer<
  typeof removeGroupCustomersSchema
>;
export type DeleteManyGroupsInput = z.infer<typeof deleteManyGroupSchema>;
export type PaginationQuery = z.infer<typeof paginationQuery>;

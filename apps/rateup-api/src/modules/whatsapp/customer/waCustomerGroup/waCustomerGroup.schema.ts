import { buildJsonSchemas } from 'fastify-zod';
import { z } from 'zod';

const waCustomerGroupCore = {
    name: z.string(),
    waCustomers: z.array(z.string()),
}

const createWaCustomerGroupInputSchema = z.object({
    name: z.string(),
    teamId: z.string(),
    data: z.array(z.object({
        phone: z.string(),
        name: z.string().optional(),
    }))
})
const waCustomerGroupsByIdParamsSchema = z.object({
    waCustomerGroupId: z.string(),
})

const deleteWaCustomerFromWaCustomerGroupParamsSchema = z.object({
    waCustomerGroupId: z.string(),
    waCustomerId: z.string(),
})
//
const updateWaCustomerGroupInputSchema = z.object({
    name: z.string()
})
const addWaCustomersToWaCustomerGroupInputSchema = z.array(z.string())

export const { schemas: waCustomerGroupSchemas, $ref: $WaCGref } = buildJsonSchemas({
    createWaCustomerGroupInputSchema,
    waCustomerGroupsByIdParamsSchema,
    deleteWaCustomerFromWaCustomerGroupParamsSchema,
    updateWaCustomerGroupInputSchema,
    addWaCustomersToWaCustomerGroupInputSchema
},
    { $id: "waCustomerGroupSchema" });
export type CreateWaCustomerGroupInput = z.infer<typeof createWaCustomerGroupInputSchema>;
export type WaCustomerGroupsByIdParams = z.infer<typeof waCustomerGroupsByIdParamsSchema>;
export type DeleteWaCustomerFromWaCustomerGroupParams = z.infer<typeof deleteWaCustomerFromWaCustomerGroupParamsSchema>;
export type UpdateWaCustomerGroupInput = z.infer<typeof updateWaCustomerGroupInputSchema>;
export type AddWaCustomersToWaCustomerGroupInput = z.infer<typeof addWaCustomersToWaCustomerGroupInputSchema>;
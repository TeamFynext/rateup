import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const waCustomerByIdParamsSchema = z.object({
    waCustomerId: z.string(),
})
const waCustomerByPhoneParamsSchema = z.object({
    phone: z.string(),
})
const createWaCustomersInputSchema = z.object({
    teamId: z.string(),
    waCustomers: z.array(z.object({
        phone: z.string(),
        name: z.string().optional(),
    }))
})

// Only name can be updated for now
const updateWaCustomerInputSchema = z.object({
    name: z.string().optional(),
})

export const { schemas: waCustomerSchemas, $ref: $WaCustomerRef } = buildJsonSchemas({
    waCustomerByIdParamsSchema: waCustomerByIdParamsSchema,
    createWaCustomersInputSchema,
    updateWaCustomerInputSchema,    waCustomerByPhoneParamsSchema
}, {
    $id: "waCustomerSchema"
})

export type WaCustomerByIdParams = z.infer<typeof waCustomerByIdParamsSchema>;
export type CreateWaCustomersInput = z.infer<typeof createWaCustomersInputSchema>;
export type UpdateWaCustomerInput = z.infer<typeof updateWaCustomerInputSchema>;
export type waCustomerByPhoneParamsSchema = z.infer<typeof waCustomerByPhoneParamsSchema>;
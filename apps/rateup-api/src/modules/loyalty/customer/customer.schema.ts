import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

export const LCustomerSchema = z.object({
  name: z.string().optional(),
  phone: z.string(),
  email: z.string().optional(),
  orgId: z.string(),
  totalEarnedPoints: z.number().optional(),
});

const actionCustomerIdParamSchema = z.object({
  customerId: z.string(),
  actionId: z.string(),
});

export const { schemas: loyaltyCustomerSchemas, $ref: $lCustomerRef } =
  buildJsonSchemas(
    {
      LCustomerSchema,
      actionCustomerIdParamSchema,
    },
    {
      $id: "loyaltyCustomerSchema",
    },
  );

export type LCustomerInput = z.infer<typeof LCustomerSchema>;
export type CustomerActionParamInput = z.infer<
  typeof actionCustomerIdParamSchema
>;

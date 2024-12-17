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
const amountSchema = z.object({
  amount: z.number().optional(),
});

export const { schemas: loyaltyCustomerSchemas, $ref: $lCustomerRef } =
  buildJsonSchemas(
    {
      LCustomerSchema,
      actionCustomerIdParamSchema,
      amountSchema,
    },
    {
      $id: "loyaltyCustomerSchema",
    },
  );

export type LCustomerInput = z.infer<typeof LCustomerSchema>;
export type CustomerActionParamInput = z.infer<
  typeof actionCustomerIdParamSchema
>;
export type AmountInput = z.infer<typeof amountSchema>;

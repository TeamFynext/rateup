import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

export const LCustomerSchema = z.object({
  name: z.string().optional(),
  phone: z.string(),
  email: z.string().optional(),
  dob: z.date().optional().nullable(),
  orgId: z.string(),
  totalEarnedPoints: z.number().optional(),
  source: z.string().optional(),
  external_id: z.string().optional(),
  customFields: z
    .array(
      z.object({
        id: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
});

const actionCustomerIdParamSchema = z.object({
  phone: z.string(),
  actionId: z.string(),
});

const byCustomerIdSchema = z.object({
  customerId: z.string(),
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
      byCustomerIdSchema,
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
export type CustomerIdInput = z.infer<typeof byCustomerIdSchema>;

import { LoyaltyCustomer } from "@prisma/client";
import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

export const bylCustomerIdParamSchema = z.object({
  lCustomerId: z.string(),
});

export const { schemas: lCustomerSchemas, $ref: $lCustomerRef } =
  buildJsonSchemas(
    {
      bylCustomerIdParamSchema,
    },
    {
      $id: "loyaltyCustomer",
    },
  );

export const LCustomerSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  name: z.string().optional(),
  phone: z.string(),
  email: z.string().optional(),
  points: z.number(),
  orgId: z.string(),
});

export const createLCustomerSchema = LCustomerSchema.omit({
  id: true,
  createdAt: true,
  points: true,
  orgId: true,
});
export const updateLCustomerSchema = createLCustomerSchema.partial();

export type BylCustomerIdParam = z.infer<typeof bylCustomerIdParamSchema>;
export type CreateLCustomerInput = Partial<
  Omit<LoyaltyCustomer, "id" | "createdAt">
> & { phone: string; orgId: string };
export type UpdateLCustomerInput = Partial<Omit<CreateLCustomerInput, "phone">>;

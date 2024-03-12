import { LoyaltyCustomer } from "@prisma/client";
import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const bylCustomerIdParamSchema = z.object({
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

export type BylCustomerIdParam = z.infer<typeof bylCustomerIdParamSchema>;
export type CreateLCustomerInput = Partial<
  Omit<LoyaltyCustomer, "id" | "createdAt">
> & { phone: string; orgId: string };
export type UpdateLCustomerInput = Partial<Omit<CreateLCustomerInput, "phone">>;

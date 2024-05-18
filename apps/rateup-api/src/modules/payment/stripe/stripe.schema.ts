import { PaymentPlanStatus } from "@prisma/client";
import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const createStripeCheckoutSchema = z.object({
  priceId: z.string().trim().min(1),
});

const updateProductSchema = z.object({
  productId: z.string(),
  status: z.nativeEnum(PaymentPlanStatus).optional(),
});

export const { schemas: paymentStripeSchemas, $ref: $PSref } = buildJsonSchemas(
  {
    createStripeCheckoutSchema,
    updateProductSchema,
  },
  { $id: "paymentStripeSchema" },
);

export type CreateStripeCheckoutInput = z.infer<
  typeof createStripeCheckoutSchema
>;
export type updateProductInput = z.infer<typeof updateProductSchema>;

import { PaymentPlanStatus } from "../../../../generated/prisma/client.js";
import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const createStripeCheckoutSchema = z.object({
  orgId: z.string({
    required_error: "Org Id is required",
  }),
  priceId: z.string({
    required_error: "Price Id is required",
  }),
  planName: z.string({
    required_error: "Plan name is required",
  }),
  rateupPlanId: z.string({
    required_error: "Rateup Plan Id is required",
  }),
  email: z
    .string({
      required_error: "Email Id is required",
    })
    .email("Invalid email."),
});

const updateProductSchema = z.object({
  productId: z.string(),
  status: z.nativeEnum(PaymentPlanStatus).optional(),
});

const getSessionStatus = z.object({
  session_id: z.string(),
});

const productIdParamsSchema = z.object({
  productId: z.string(),
});

export const { schemas: paymentStripeSchemas, $ref: $PSref } = buildJsonSchemas(
  {
    createStripeCheckoutSchema,
    updateProductSchema,
    getSessionStatus,
    productIdParamsSchema,
  },
  { $id: "paymentStripeSchema" },
);

export type CreateStripeCheckoutInput = z.infer<
  typeof createStripeCheckoutSchema
>;
export type updateProductInput = z.infer<typeof updateProductSchema>;

export type GetSessionStatusQuery = z.infer<typeof getSessionStatus>;
export type productIdParamsInput = z.infer<typeof productIdParamsSchema>;

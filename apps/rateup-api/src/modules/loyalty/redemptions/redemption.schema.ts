import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

export const redemptionIdParamSchema = z.object({
  redemptionId: z.string(),
});

export const transactionFilterSchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  transactionType: z
    .enum(["earn", "redeem", "adjust", "expire", "refund"])
    .optional(),
  source: z.string().optional(),
  customerId: z.string().optional(),
  minPoints: z.number().optional(),
  maxPoints: z.number().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  export: z.enum(["excel", "csv"]).optional(),
});

export const { schemas: redemptionSchemas, $ref: $redemptionRef } =
  buildJsonSchemas(
    {
      redemptionIdParamSchema,
      transactionFilterSchema,
    },
    {
      $id: "redemptionSchema",
    },
  );

export type RedemptionIdParam = z.infer<typeof redemptionIdParamSchema>;
export type TransactionFilter = z.infer<typeof transactionFilterSchema>;

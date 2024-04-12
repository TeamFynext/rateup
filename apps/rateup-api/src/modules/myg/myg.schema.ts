import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const invoiceSchema = z.object({
  invoice_date: z.string(),
  invoice_number: z.string(),
  invoice_value: z.number(),
  mobile_number: z.string(),
  invoice_branch: z.string(),
  invoice_discount: z.number().optional(),
});

const uploadInvoiceDataRequestSchema = z.array(invoiceSchema);

export const { schemas: mygSchemas, $ref: $MYGRef } = buildJsonSchemas(
  {
    uploadInvoiceDataRequestSchema,
  },
  { $id: "mygSchema" },
);

export type UploadInvoiceSchema = z.infer<
  typeof uploadInvoiceDataRequestSchema
>;

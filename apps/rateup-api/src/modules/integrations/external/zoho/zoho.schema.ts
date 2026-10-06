import z from "zod";

const zohoQuerySchema = z.object({
  orgId: z.string().optional(),
  product: z.enum(["crm", "bigin"]).optional(),
});

export { zohoQuerySchema };

import z from "zod";

const successSchema = z.object({
  success: z.boolean(),
});

const zohoAuthSchema = z.object({
  code: z.string(),
});

const zohoQuerySchema = z.object({
  orgId: z.string().optional(),
  product: z.enum(["crm", "bigin"]).optional(),
});

export { successSchema, zohoAuthSchema, zohoQuerySchema };

import z from "zod";

const paramsSchema = z.object({
  resourceName: z.string().optional(),
  id: z.string(),
});

const bodySchema = z.object({
  qrBgColor: z.string(),
  qrColor: z.string(),
  logoSize: z.coerce.number(),
  logoFillType: z.string(),
  logoBorderRadius: z.coerce.number(),
  logoFile: z.union([z.object({}).loose(), z.string()]).optional(),
  isLogoEnabled: z.coerce.boolean().optional(),
});

const responseSchema = z
  .object({
    qrBgColor: z.string(),
    qrColor: z.string(),
    logoSize: z.number(),
    logoFillType: z.string(),
    logoBorderRadius: z.number(),
    logoFile: z.string().nullable().optional(),
    isLogoEnabled: z.boolean().optional(),
  })
  .nullable();

export { paramsSchema, bodySchema, responseSchema };

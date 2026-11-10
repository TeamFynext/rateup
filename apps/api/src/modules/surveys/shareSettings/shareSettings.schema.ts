import z from "zod";

const SHARE_SETTINGS_RESOURCES = ["survey", "generateQr"] as const;
export type ShareSettingsResource = (typeof SHARE_SETTINGS_RESOURCES)[number];

const paramsSchema = z.object({
  resourceName: z.enum(SHARE_SETTINGS_RESOURCES),
  id: z.string(),
});

const bodySchema = z.object({
  qrBgColor: z.string(),
  qrColor: z.string(),
  logoSize: z.coerce.number(),
  logoFillType: z.string(),
  logoBorderRadius: z.coerce.number(),
  logoFile: z.union([z.object({}).loose(), z.string()]).optional(),
  isLogoEnabled: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((v) => v === true || v === "true")
    .optional(),
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

export { paramsSchema, bodySchema, responseSchema, SHARE_SETTINGS_RESOURCES };

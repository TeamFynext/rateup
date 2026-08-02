import z from "zod";

/**
 * The resource the path segment selects. It used to be `z.string().optional()`,
 * so authorisation rested on a string comparison against a value the caller
 * supplied — the service's switch had no `default`, and a mismatched name
 * ("Survey", "surveys", nothing at all) touched no table only by coincidence.
 * An enum makes the set of resources the schema's business rather than a
 * coincidence of two files agreeing. See issues.txt 35.1.
 */
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
  // Was `z.coerce.boolean()`, which treats every non-empty string as true — and
  // multipart sends booleans as strings, so a form posting `isLogoEnabled=false`
  // stored true and turning the logo off did not turn it off.
  // See issues.txt 35.6.
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

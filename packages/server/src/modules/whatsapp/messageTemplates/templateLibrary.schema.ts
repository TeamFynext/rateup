import { z } from "zod";
import { TemplateType } from "../../../generated/prisma/client.js";

/** A comma-separated query value, or a repeated one, as an array. */
const listParam = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) =>
    (Array.isArray(value) ? value : (value ?? "").split(","))
      .map((item) => item.trim())
      .filter(Boolean),
  );

/** `GET /templates/library`: Meta's filters, passed through. */
export const templateLibraryQuerySchema = z.object({
  /** The channel whose account browses; the catalogue differs per account. */
  whatsappSettingsPhoneId: z.string().optional(),
  search: z.string().trim().max(200).optional(),
  language: z.string().trim().max(20).optional(),
  category: listParam,
  topic: listParam,
  usecase: listParam,
  industry: listParam,
  after: z.string().max(500).optional(),
});

const libraryButtonInputSchema = z.object({
  /** The button's position in the library entry, from `required_inputs.buttons[].index`. */
  index: z.number().int().min(0).optional(),
  type: z.enum(["URL", "PHONE_NUMBER", "QUICK_REPLY", "OTP", "FLOW", "COPY_CODE"]),
  url: z.string().trim().max(2000).optional(),
  /** The value that replaces a trailing `{{1}}` in `url`. */
  urlSuffixExample: z.string().trim().max(2000).optional(),
  phoneNumber: z.string().trim().max(25).optional(),
});

/** `POST /templates/library`: a template on the org's account from a library entry. */
export const createFromLibrarySchema = z
  .object({
    whatsappSettingsPhoneId: z.string().min(1),
    name: z
      .string()
      .trim()
      .regex(/^[a-z_0-9]+$/, { error: "Name can only have lower-case letters and underscores" })
      .min(1)
      .max(512),
    libraryTemplateName: z.string().trim().min(1).max(512),
    language: z.string().trim().min(2).max(20),
    category: z.enum(["UTILITY", "AUTHENTICATION"]).optional(),
    templateType: z.enum(TemplateType).optional(),
    buttons: z.array(libraryButtonInputSchema).max(10).optional(),
    /** Named body inputs (e.g. `business_name`). They become fixed text in the template. */
    bodyInputs: z.record(z.string(), z.string().trim().max(1024)).optional(),
  })
  .superRefine((input, ctx) => {
    input.buttons?.forEach((button, i) => {
      if (button.type === "URL" && !button.url) {
        ctx.addIssue({ code: "custom", path: ["buttons", i, "url"], message: "Enter a URL" });
      }
      if (button.type === "URL" && button.url && !/^https?:\/\//i.test(button.url)) {
        ctx.addIssue({
          code: "custom",
          path: ["buttons", i, "url"],
          message: "The URL must start with https://",
        });
      }
      if (button.type === "URL" && button.url?.includes("{{1}}") && !button.urlSuffixExample) {
        ctx.addIssue({
          code: "custom",
          path: ["buttons", i, "urlSuffixExample"],
          message: "Give an example value for {{1}}",
        });
      }
      if (button.type === "PHONE_NUMBER" && !button.phoneNumber) {
        ctx.addIssue({
          code: "custom",
          path: ["buttons", i, "phoneNumber"],
          message: "Enter a phone number",
        });
      }
    });
  });

export type TemplateLibraryQuery = z.infer<typeof templateLibraryQuerySchema>;
export type CreateFromLibraryInput = z.infer<typeof createFromLibrarySchema>;

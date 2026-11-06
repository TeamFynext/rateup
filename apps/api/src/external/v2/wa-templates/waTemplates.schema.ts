import { z } from "zod";

import { TemplateType } from "../../../generated/prisma/client.js";
import { WaTemplateStatus } from "../../../types/enums.js";
import { pageSchema, paginationQuerySchema } from "../pagination.js";
import { waRecipientSchema } from "../phone.js";

/** The header media a template can carry. Meta templates have no audio or sticker header. */
const headerMediaTypeSchema = z.enum(["image", "video", "document"]);
export type HeaderMediaType = z.infer<typeof headerMediaTypeSchema>;

// ---- list ---------------------------------------------------------------------------

export const templateListQuerySchema = paginationQuerySchema.extend({
  templateType: z.enum(TemplateType).optional(),
  status: z.enum(WaTemplateStatus).optional().describe("Meta's review status"),
});
export type TemplateListQuery = z.infer<typeof templateListQuerySchema>;

const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  language: z.string(),
  status: z.string().describe("APPROVED, PENDING, REJECTED, DRAFT, …"),
  category: z.string().nullable(),
  templateType: z.string(),
  createdAt: z.iso.datetime(),
  components: z.array(
    z.object({
      type: z.string().describe("HEADER, BODY, FOOTER, BUTTONS, CAROUSEL"),
      format: z.string().nullable().describe("A header's format: TEXT, IMAGE, VIDEO, DOCUMENT, …"),
      text: z.string().nullable().describe("With `{{n}}` placeholders where variables go"),
      buttons: z
        .array(
          z.object({
            type: z.string(),
            text: z.string().nullable(),
            url: z.string().nullable(),
            phoneNumber: z.string().nullable(),
          }),
        )
        .nullable(),
    }),
  ),
});
export const templateListSchema = pageSchema(templateSchema);

// ---- sending ------------------------------------------------------------------------

const MAX_SCHEDULE_MINUTES = 30 * 24 * 60;

const headerMediaSchema = z.object({
  type: headerMediaTypeSchema,
  link: z.url().max(2000).describe("A public URL WhatsApp can fetch the media from"),
  filename: z.string().min(1).max(240).optional().describe("Shown for a document header"),
});

/** What every send takes besides the recipient and the template. */
const sendParams = {
  bodyVariables: z
    .array(z.coerce.string().max(1024))
    .max(100)
    .optional()
    .describe("Values for the body's {{1}}, {{2}}, … in order"),
  buttonVariable: z
    .string()
    .max(2000)
    .optional()
    .describe("The dynamic suffix of a URL button, or a copy-code button's code"),
  quickReplyPayload: z
    .array(z.coerce.string().max(1000))
    .max(10)
    .optional()
    .describe("One payload per quick-reply button, in the template's button order"),
  teamId: z.uuid().optional().describe("Attributes the send to this team; must be the org's"),
  tag: z.string().max(100).optional(),
};

export const sendTemplateBodySchema = z.object({
  templateName: z.string().min(1).max(512),
  language: z
    .string()
    .min(2)
    .max(15)
    .optional()
    .describe("e.g. en_US. Required when the template exists in several languages"),
  phone: waRecipientSchema,
  header: headerMediaSchema.optional().describe("Overrides the template's default header media"),
  scheduleInMinutes: z
    .int()
    .min(15)
    .max(MAX_SCHEDULE_MINUTES)
    .optional()
    .describe("Send later instead of now"),
  ...sendParams,
});
export type SendTemplateBody = z.infer<typeof sendTemplateBodySchema>;

/**
 * Multipart text fields arrive as strings; a list may come as a JSON array (`["a","b"]`),
 * as the same field repeated, or as one plain value meaning a one-item list.
 */
const multipartList = <T extends z.ZodType>(item: T, max: number) =>
  z.preprocess((value) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return value;
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return [value];
    }
  }, z.array(item).max(max));

/** The text fields of `send-with-file`, validated by hand: they are not a JSON body. */
export const sendWithFileFieldsSchema = z.object({
  templateName: sendTemplateBodySchema.shape.templateName,
  language: sendTemplateBodySchema.shape.language,
  phone: waRecipientSchema,
  headerType: headerMediaTypeSchema.optional(),
  filename: z.string().min(1).max(240).optional(),
  fileSize: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .describe("The file's exact size in bytes. Optional; lets the upload carry a Content-Length"),
  scheduleInMinutes: z.coerce.number().int().min(15).max(MAX_SCHEDULE_MINUTES).optional(),
  bodyVariables: multipartList(z.coerce.string().max(1024), 100).optional(),
  buttonVariable: sendParams.buttonVariable,
  quickReplyPayload: multipartList(z.coerce.string().max(1000), 10).optional(),
  teamId: sendParams.teamId,
  tag: sendParams.tag,
});
export type SendWithFileFields = z.infer<typeof sendWithFileFieldsSchema>;

/**
 * The `send-with-file` form as the reference documents it: every part as it travels (text
 * fields are strings), then the file. Documentation only — the route does not validate its body
 * against this, because the handler streams the parts itself and checks the fields with
 * `sendWithFileFieldsSchema`. waTemplates.test.ts keeps the two field lists identical.
 */
export const sendWithFileFormSchema = z.object({
  templateName: z.string().describe("The approved template's name"),
  phone: z
    .string()
    .describe(
      "Digits with the country code, no `+` (e.g. 919876543210), or the contact's `businessScopedUserId`",
    ),
  language: z
    .string()
    .optional()
    .describe("Language code; needed when the template exists in more than one"),
  headerType: headerMediaTypeSchema
    .optional()
    .describe("The template's media header type. Required when a file is sent"),
  filename: z.string().optional().describe("Shown to the customer for a document header"),
  fileSize: z
    .string()
    .optional()
    .describe("The file's exact size in bytes; lets the upload carry a Content-Length"),
  bodyVariables: z
    .string()
    .optional()
    .describe('Values for the body\'s {{1}}, {{2}}, … as a JSON array, e.g. ["Ann","500"]'),
  buttonVariable: z
    .string()
    .optional()
    .describe("The dynamic suffix of a URL button, or a copy-code button's code"),
  quickReplyPayload: z
    .string()
    .optional()
    .describe("Quick-reply button payloads as a JSON array, in button order"),
  teamId: z.string().optional().describe("Team to send as (UUID)"),
  tag: z.string().optional().describe("A label stored with the message"),
  scheduleInMinutes: z
    .string()
    .optional()
    .describe("Send this many minutes from now instead (15 – 43200)"),
  file: z
    .string()
    .meta({ format: "binary" })
    .optional()
    .describe(
      "The header media, sent last. Image 5 MB (jpeg/png), video 16 MB (mp4/3gpp), " +
        "document 100 MB. Leave it out to send the template without a media header",
    ),
});

export const sendResultSchema = z.union([
  z.object({
    status: z.literal("accepted").describe("WhatsApp accepted it; follow delivery by messageId"),
    messageId: z.string(),
  }),
  z.object({
    status: z.literal("scheduled"),
    scheduleId: z.string(),
    scheduledAt: z.iso.datetime(),
  }),
]);

export const templateIdParamsSchema = z.object({ templateId: z.uuid() });
export type TemplateIdParams = z.infer<typeof templateIdParamsSchema>;

export const sendToContactsBodySchema = z.object({
  contactIds: z.array(z.uuid()).min(1).max(1000),
  header: headerMediaSchema.optional(),
  ...sendParams,
});
export type SendToContactsBody = z.infer<typeof sendToContactsBodySchema>;

export const sendToContactsResultSchema = z.object({
  sent: z.array(z.object({ contactId: z.string(), messageId: z.string() })),
  failed: z.array(
    z.object({
      contactId: z.string(),
      code: z.string().describe("send_failed, contact_limit_reached, template_not_sendable, …"),
      metaCode: z.number().nullable().describe("Meta's error code, when Meta refused it"),
    }),
  ),
  skipped: z.array(
    z.object({
      contactId: z.string(),
      reason: z
        .enum(["not_found", "no_phone"])
        .describe(
          "`no_phone`: the contact has neither a phone number nor a business-scoped user ID (BSUID)",
        ),
    }),
  ),
});

// ---- message status -----------------------------------------------------------------

export const messageIdParamsSchema = z.object({
  messageId: z.string().min(1).max(200).describe("The `messageId` a send returned (wamid.…)"),
});
export type MessageIdParams = z.infer<typeof messageIdParamsSchema>;

export const messageStatusSchema = z.object({
  messageId: z.string(),
  status: z.enum(["pending", "sent", "delivered", "read", "failed"]),
  createdAt: z.iso.datetime(),
  sentAt: z.iso.datetime().nullable(),
  deliveredAt: z.iso.datetime().nullable(),
  readAt: z.iso.datetime().nullable(),
  failedAt: z.iso.datetime().nullable(),
  error: z.object({ code: z.number().nullable(), message: z.string() }).nullable(),
});

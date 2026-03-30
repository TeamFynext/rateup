import { z } from "zod";
import { byTemplateIdParamsSchema } from "./wa_templates.schema.js";

const dbTemplateResponse = z.object({
  id: z.string(),
  createdAt: z.date(),
  data: z.any(), // TODO: Add the correct schema here
});

enum WaTemplateAllowedComponentTypes {
  header = "header",
}
enum WaTemplateSendMediaTypes {
  document = "document",
  image = "image",
  video = "video",
}

const templateHeaderComponent = z.object({
  type: z.enum(WaTemplateAllowedComponentTypes),
  parameters: z
    .array(
      z.object({
        type: z.enum(WaTemplateSendMediaTypes),
        image: z
          .object({
            link: z.string(),
            caption: z.string().optional(),
          })
          .optional(),
        document: z
          .object({
            link: z.string(),
            filename: z.string().optional(),
            caption: z.string().optional(),
          })
          .optional(),
        video: z
          .object({
            link: z.string(),
            caption: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

const scheduleTemplate = z.object({
  timeDelay: z.int().min(15).optional(),
});

const sendTemplatesToContacts = scheduleTemplate.extend({
  teamId: z.string().optional(),
  contactIds: z.array(z.string()),
  header: templateHeaderComponent.optional(),
});
const sendTemplateToContactsParamsWithOrgId = byTemplateIdParamsSchema.extend({
  orgId: z.string(),
});
const sendTemplateToContact = sendTemplatesToContacts
  .omit({ contactIds: true })
  .extend({
    body_variables: z.array(z.string()).optional(),
  });

const sendTemplateByNameToPhone = scheduleTemplate.extend({
  templateName: z.string(),
  phone: z.number(),
  body_variables: z.array(z.string()).optional(),
  teamId: z.string().optional(),
  tag: z.string().optional(),
  parameterData: z
    .array(
      z.object({
        type: z.enum(WaTemplateSendMediaTypes),
        link: z.string(),
        filename: z.string().optional(),
      }),
    )
    .optional(),
  from: z.number().optional(),
  buttonVariable: z.string().optional(),
});
const sendTemplateWithFile = z.object({
  templateName: z.string(),
  phone: z.number().optional(),
  timeDelay: z.int().optional(),
  teamId: z.string().optional(),
  body_variables: z.array(z.string()).optional(),
  tag: z.string().optional(),
  headerType: z.enum(WaTemplateSendMediaTypes).optional(),
  filename: z.string().optional(),
  file: z.object({
    filename: z.string(),
    encoding: z.string(),
    mimetype: z.string(),
    size: z.number(),
    data: z.any(),
  }),
  from: z.number().optional(),
  buttonVariable: z.string().optional(),
});

const sendTemplateToContactParams = z.object({
  templateId: z.string(),
  contactId: z.string(),
});

const sendTemplateToContactParamsWithOrgId = sendTemplateToContactParams.extend(
  {
    orgId: z.string(),
  },
);

const sendTemplatesToContactGroups = scheduleTemplate.extend({
  teamId: z.string().optional(),
  contactGroupIds: z.array(z.string()),
  header: templateHeaderComponent.optional(),
});

const sendTemplateToContactGroupsParamsWithOrgId =
  byTemplateIdParamsSchema.extend({
    orgId: z.string(),
  });
const errorLogsQuery = z.object({
  startDate: z
    .string()
    .optional()
    .describe("Filter logs from this date (FORMAT: mm/dd/yyyy)"),
  endDate: z
    .string()
    .optional()
    .describe("Filter logs before this date (FORMAT: mm/dd/yyyy)"),
});

const errorLogResponse = z.object({
  id: z.string(),
  messageId: z.string().nullable(),
  templateId: z.string().nullable(),
  errorMessage: z.string(),
  errorCode: z.string().nullable(),
  timestamp: z.string(),
  details: z.record(z.string(), z.any()),
});

const messageStatusParams = z.object({
  messageId: z.string(),
  orgId: z.string(),
});

const messageStatusResponse = z.object({
  messageId: z.string(),
  status: z.enum(["sent", "delivered", "read", "failed", "pending"]),
  timestamp: z.string(),
  deliveredAt: z.string().nullable(),
  readAt: z.string().nullable(),
  errorDetails: z
    .object({
      errorCode: z.string(),
      errorMessage: z.string(),
    })
    .nullable(),
});

export type SendTemplateToContacts = z.infer<typeof sendTemplatesToContacts>;
export type SendTemplateToContact = z.infer<typeof sendTemplateToContact>;
export type SendTemplateToContactParams = z.infer<
  typeof sendTemplateToContactParams
>;
export type SendTemplateToContactGroups = z.infer<
  typeof sendTemplatesToContactGroups
>;
export type SendTemplateHeaderComponent = z.infer<
  typeof templateHeaderComponent
>;
export type SendTemplateByNameToPhone = z.infer<
  typeof sendTemplateByNameToPhone
>;

export type ErrorLogsQuery = z.infer<typeof errorLogsQuery>;

export type SendTemplateWithFile = z.infer<typeof sendTemplateWithFile>;

export type SendTemplateToContactParamsWithOrgId = z.infer<
  typeof sendTemplateToContactParamsWithOrgId
>;

// Auto-exported after fastify-zod migration
export {
  dbTemplateResponse,
  sendTemplatesToContacts,
  sendTemplatesToContactGroups,
  sendTemplateToContact,
  sendTemplateToContactParams,
  sendTemplateToContactParamsWithOrgId,
  sendTemplateToContactsParamsWithOrgId,
  sendTemplateToContactGroupsParamsWithOrgId,
  sendTemplateByNameToPhone,
  errorLogsQuery,
  errorLogResponse,
  messageStatusParams,
  messageStatusResponse,
};

import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { byTemplateIdParamsSchema } from "../internal-copy/whatsapp/messageTemplates/wa_templates.schema";

const dbTemplateResponse = z.object({
  id: z.string(),
  createdAt: z.string(),
  data: z.any(), // TODO: Add the correct schema here
});

enum WaTemplateAllowedComponentTypes {
  header = "header",
}
enum WaTemplateSendMediaTypes {
  image = "image",
  video = "video",
  document = "document",
}
const templateHeaderComponent = z.object({
  type: z.nativeEnum(WaTemplateAllowedComponentTypes),
  parameters: z
    .array(
      z.object({
        type: z.nativeEnum(WaTemplateSendMediaTypes),
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

const sendTemplatesToContacts = z.object({
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
const sendTemplateByNameToPhone = z.object({
  templateName: z.string(),
  phone: z.string(),
  body_variables: z.array(z.string()).optional(),
  teamId: z.string().optional(),
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

const sendTemplatesToContactGroups = z.object({
  teamId: z.string().optional(),
  contactGroupIds: z.array(z.string()),
  header: templateHeaderComponent,
});

const sendTemplateToContactGroupsParamsWithOrgId =
  byTemplateIdParamsSchema.extend({
    orgId: z.string(),
  });

export const {
  schemas: waTemplateExternalSchemas,
  $ref: $waTemplateExternalRef,
} = buildJsonSchemas(
  {
    dbTemplateResponse,
    sendTemplatesToContacts,
    sendTemplatesToContactGroups,
    sendTemplateToContact,
    sendTemplateToContactParams,
    sendTemplateToContactParamsWithOrgId,
    sendTemplateToContactsParamsWithOrgId,
    sendTemplateToContactGroupsParamsWithOrgId,
    sendTemplateByNameToPhone,
  },
  { $id: "waTemplateExternal" },
);

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

import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { WaTemplateSupportedFormats } from "../../../../../types/enums";

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

const sendTemplatesToContactGroups = z.object({
  teamId: z.string().optional(),
  contactGroupIds: z.array(z.string()),
  header: templateHeaderComponent,
});

export const {
  schemas: waTemplateExternalSchemas,
  $ref: $waTemplateExternalRef,
} = buildJsonSchemas(
  {
    dbTemplateResponse,
    sendTemplatesToContacts,
    sendTemplatesToContactGroups,
  },
  { $id: "waTemplateExternal" },
);

export type SendTemplateToContacts = z.infer<typeof sendTemplatesToContacts>;
export type SendTemplateToContactGroups = z.infer<
  typeof sendTemplatesToContactGroups
>;
export type SendTemplateHeaderComponent = z.infer<
  typeof templateHeaderComponent
>;

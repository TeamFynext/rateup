import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import {
  WaTemplateComponentType,
  WaButtonType,
  WaTemplateCategory,
  WaTemplateSupportedFormats,
} from "../../../types/enums";

const templateNameRegex = /^[a-z_]+$/;

const waTemplateInput = {
  name: z.string().regex(templateNameRegex).max(512),
  header: z.string(),
  body: z.string().max(1024).min(1),
  footer: z.string().max(60),
  declineButton: z.string().max(20),
  acceptButton: z.string().max(20),
  category: z.string(),
  format: z.string(),
  buttons: z.string(),
};

const waTemplateFormattedInput = {
  name: z.string().regex(templateNameRegex),
  components: z.array(
    z.union([
      z.object({
        type: z.literal(WaTemplateComponentType.BODY),
        text: z.string().max(1024),
      }),
      z.object({
        type: z.literal(WaTemplateComponentType.HEADER),
        format: z.any(),
        text: z.string().max(60),
      }),
      z.object({
        type: z.literal(WaTemplateComponentType.FOOTER),
        text: z.string().max(60),
      }),
      z.object({
        type: z.literal(WaTemplateComponentType.BUTTONS),
        buttons: z.array(
          z.object({
            // only for quick reply buttons
            type: z.literal(WaButtonType.QUICK_REPLY),
            text: z.string().max(25),
          }),
        ),
      }),
    ]),
  ),
  language: z.string(),
  category: z.nativeEnum(WaTemplateCategory),
};
const waTemplateInputSchema = z.object(waTemplateInput);
const waTemplateFormattedInputSchema = z.object(waTemplateFormattedInput);

// used for saving to db
const waTemplateCore = {
  ...waTemplateInput,
  id: z.string(),
  language: z.string(),
  status: z.string(),
  category: z.string(),
};
// used by whatsapp api
const waTemplateFormattedCore = {
  ...waTemplateFormattedInput,
  id: z.string(),
  status: z.string(),
};
const waTemplateSchema = z.object(waTemplateCore);
const waTemplateFormattedSchema = z.object(waTemplateFormattedCore);

const byTemplateIdParamsSchema = z.object({
  templateId: z.string(),
});

const registerTemplatesInDbBodySchema = z.array(
  z.object({
    data: waTemplateSchema,
    acceptButton: z.string().max(20),
  }),
);

export const { schemas: waTemplateSchemas, $ref: $WTref } = buildJsonSchemas(
  {
    waTemplateInputSchema,
    waTemplateSchema,
    byTemplateIdParamsSchema,
    registerTemplatesInDbBodySchema,
  },
  { $id: "waTemplates" },
);

export type CreateWaTemplateInput = z.infer<typeof waTemplateInputSchema>;
export type CreateWaTemplateFormattedInput = z.infer<
  typeof waTemplateFormattedInputSchema
>;
export type WaTemplate = z.infer<typeof waTemplateSchema>;
export type WaTemplateFormatted = z.infer<typeof waTemplateFormattedSchema>;
export type ByTemplateIdParamsSchema = z.infer<typeof byTemplateIdParamsSchema>;
export type RegisterTemplatesInDbBodySchema = z.infer<
  typeof registerTemplatesInDbBodySchema
>;

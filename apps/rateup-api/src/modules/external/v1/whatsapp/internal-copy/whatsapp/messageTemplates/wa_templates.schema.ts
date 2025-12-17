import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import {
  WaButtonType,
  WaTemplateCategory,
  WaTemplateComponentType,
} from "../../../../../../../types/enums.js";

const waTemplateInput = {
  id: z.string().optional(),
  name: z
    .string()
    .regex(/^[a-z_0-9]+$/, {
      message: "Name can only have lower-case letters and underscores",
    })
    .trim()
    .min(1)
    .max(512),
  header: z.string(),
  body: z.string().max(1024).min(1),
  footer: z.string().max(60),
  category: z.string(),
  format: z.string(),
  language: z.string(),
  buttons: z
    .array(
      z.object({
        text: z.string().min(1).max(25).optional(),
        type: z.string().min(1),
        phone_number: z.string().max(25).optional(),
        url: z.string().max(2000).optional(),
        example: z.string().max(15).optional(),
        flow_id: z.string().optional(),
        flow_action: z.string().optional(),
        navigate_screen: z.string().optional(),
      }),
    )
    .optional(),
  example: z.array(z.string()).optional(),
  defaultValues: z
    .object({
      image: z
        .object({
          link: z.string(),
        })
        .optional(),
    })
    .optional(),
};

const waTemplateFormattedInput = {
  name: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .refine((text) => !text.includes(" "), {
      message: "Name cannot contain spaces. Replace it with underscore(_)",
    }),
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
export const waTemplateFormattedInputSchema = z.object(
  waTemplateFormattedInput,
);

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
export const waTemplateFormattedSchema = z.object(waTemplateFormattedCore);

export const byTemplateIdParamsSchema = z.object({
  templateId: z.string(),
});

const byTemplateIdParamsWithOrg = z.object({
  templateId: z.string(),
});

const registerTemplatesInDbBodySchema = z.array(
  z.object({
    data: waTemplateSchema,
    acceptButton: z.string().max(20),
  }),
);

const waUserSendTemplateBodySchema = z.object({
  phone: z.string(),
  parameterData: z.any(),
  teamId: z.string().optional(),
});

export const { schemas: waTemplateSchemas, $ref: $WTref } = buildJsonSchemas(
  {
    waTemplateInputSchema,
    waTemplateSchema,
    byTemplateIdParamsSchema,
    byTemplateIdParamsWithOrg,
    registerTemplatesInDbBodySchema,
    waUserSendTemplateBodySchema,
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
export type WaUserSendTemplateBodySchema = z.infer<
  typeof waUserSendTemplateBodySchema
>;

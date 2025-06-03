import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import {
  WaTemplateComponentType,
  WaButtonType,
  WaTemplateCategory,
} from "../../../types/enums";
import { TemplateType } from "@prisma/client";

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
      document: z
        .object({
          link: z.string(),
          filename: z.string().optional(),
        })
        .optional(),
      video: z
        .object({
          link: z.string(),
        })
        .optional(),
      catalog: z
        .object({
          thumbnail_product_retailer_id: z.string().optional(),
          mpm: z
            .object({
              sections: z.array(
                z.object({ title: z.string(), products: z.array(z.string()) }),
              ),
            })
            .optional(),
          spm: z
            .object({
              product_retailer_id: z.string(),
            })
            .optional(),
        })
        .optional(),
      mediaCarousel: z
        .array(
          z.object({
            headerLink: z.string(),
            cardIndex: z.number(),
          }),
        )
        .optional(),
      productCarousel: z
        .array(
          z.object({
            product_retailer_id: z.string(),
            cardIndex: z.number(),
          }),
        )
        .optional(),
    })
    .optional(),
  mediaCarousel: z
    .array(
      z.object({
        body: z.string().trim().min(1).max(1024),
        header: z.string(),
        format: z.string(),
        example: z.array(z.string()).optional(),
        buttons: z
          .array(
            z.object({
              text: z.string().max(25),
              type: z.string(),
              example: z.array(z.string().trim().min(1).max(2000)).optional(),
              phone_number: z.string().max(25).optional(),
              url: z.string().trim().url().max(2000).optional(),
            }),
          )
          .max(2)
          .min(1),
      }),
    )
    .optional(),
  productCarousel: z
    .array(
      z.object({
        button: z.object({
          text: z.string().max(25),
          type: z.string(),
          example: z.array(z.string().trim().min(1).max(2000)).optional(),
          url: z.string().trim().url().max(2000).optional(),
        }),
        product_retailer_id: z.string(),
      }),
    )
    .optional(),
  templateType: z.nativeEnum(TemplateType).optional(),
  config: z.any(),
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
  allow_category_change: z.boolean().optional().nullable(),
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

const byTemplateIdParamsSchema = z.object({
  templateId: z.string(),
});
const templateTypeParamsSchema = z.object({
  templateType: z.nativeEnum(TemplateType).optional(),
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
    templateTypeParamsSchema,
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
export type TemplateTypeParamsSchema = z.infer<typeof templateTypeParamsSchema>;
export type RegisterTemplatesInDbBodySchema = z.infer<
  typeof registerTemplatesInDbBodySchema
>;
export type WaUserSendTemplateBodySchema = z.infer<
  typeof waUserSendTemplateBodySchema
>;

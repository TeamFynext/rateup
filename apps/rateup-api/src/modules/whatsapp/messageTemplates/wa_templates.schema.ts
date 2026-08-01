import { z } from "zod";
import {
  WaTemplateComponentType,
  WaButtonType,
  WaTemplateCategory,
  WaTemplateSupportedFormats,
} from "../../../types/enums.js";
import { TemplateType } from "../../../../generated/prisma/client.js";

const waTemplateInput = {
  id: z.string().optional(),
  name: z
    .string()
    .regex(/^[a-z_0-9]+$/, {
      error: "Name can only have lower-case letters and underscores",
    })
    .trim()
    .min(1)
    .max(512),
  header: z.string().nullable(),
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
        example: z.union([
          z.array(z.string().trim().min(1).max(2000)).optional(),
          z.string().trim().min(1).max(2000).optional(),
        ]),
        flow_id: z.string().optional(),
        flow_action: z.enum(["navigate", "data_exchange"]).optional(),
        navigate_screen: z.string().optional(),
        otp_type: z.literal("copy_code").optional(),
      }),
    )
    .optional(),
  code_expiration_minutes: z.string().optional(),
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
      whatsappSettingsPhoneId: z.string().optional(),
      catalog: z
        .object({
          thumbnail_product_retailer_id: z.string().optional(),
          mpm: z
            .object({
              sections: z.array(z.object({ title: z.string(), products: z.array(z.string()) })),
            })
            .optional(),
          spm: z
            .object({
              product_retailer_id: z.string(),
            })
            .optional(),
          catalogId: z.string(),
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
      orderDetails: z
        .object({
          paymentConfigName: z.string(),
          paymentType: z.string(),
          productType: z.string(),
          item: z.object({
            name: z.string(),
            salePrice: z.number(),
            price: z.number(),
            quantity: z.number(),
            origin: z.string().max(100),
            importerName: z.string().max(200),
            importerAddress1: z.string().max(100),
            importerCity: z.string().max(120),
            importerZoneCode: z.string().length(2),
            importerPostalCode: z.string().max(6),
          }),
          shipping: z.number(),
          tax: z.number(),
          discount: z.number().optional(),
          discountDescription: z.string().max(60).optional(),
          taxDescription: z.string().max(60),
          expiry: z.string().optional(),
        })
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
              url: z.url().trim().max(2000).optional(),
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
          url: z.url().trim().max(2000).optional(),
        }),
        product_retailer_id: z.string(),
      }),
    )
    .optional(),
  whatsappSettingsPhoneId: z.string(),
  templateType: z.enum(TemplateType).optional(),
  config: z.any().optional(),
};

const waTemplateFormattedInput = {
  name: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .refine((text) => !text.includes(" "), {
      error: "Name cannot contain spaces. Replace it with underscore(_)",
    }),
  components: z.array(
    z.union([
      z.object({
        type: z.literal(WaTemplateComponentType.BODY),
        // Absent on AUTHENTICATION templates, whose body Meta supplies.
        text: z.string().max(1024).optional(),
        /** Meta's sample values for the body's {{n}} placeholders. */
        /**
         * Meta's documented shape is a list of example sets (`string[][]`), but this repo
         * has always sent one flat set; both are accepted so neither side is a lie.
         */
        example: z
          .object({
            body_text: z.union([z.array(z.string()), z.array(z.array(z.string()))]).optional(),
          })
          .optional(),
        add_security_recommendation: z.boolean().optional(),
      }),
      z.object({
        type: z.literal(WaTemplateComponentType.HEADER),
        format: z.enum(WaTemplateSupportedFormats),
        // Only a TEXT header carries text; media headers carry a sample handle instead.
        text: z.string().max(60).optional(),
        example: z
          .object({
            header_text: z.array(z.string()).optional(),
            header_handle: z.array(z.string()).optional(),
          })
          .optional(),
      }),
      z.object({
        type: z.literal(WaTemplateComponentType.FOOTER),
        // AUTHENTICATION footers carry only the code expiry, no text.
        text: z.string().max(60).optional(),
        code_expiration_minutes: z.number().optional(),
      }),
      z.object({
        type: z.literal(WaTemplateComponentType.CAROUSEL),
        // Each card carries its own component list; the shapes match this union.
        cards: z.array(z.looseObject({ components: z.array(z.looseObject({})) })),
      }),
      z.object({
        type: z.literal(WaTemplateComponentType.BUTTONS),
        buttons: z.array(
          // Loose: Meta's button vocabulary is wider than the fields named here.
          z.looseObject({
            // The create payload carries the button type as sent, which is wider than
            // WaButtonType for flow/url/phone buttons.
            type: z.string().min(1),
            text: z.string().max(25).optional(),
            phone_number: z.string().optional(),
            url: z.string().optional(),
            example: z.union([z.string(), z.array(z.string())]).optional(),
            flow_id: z.string().optional(),
            flow_action: z.enum(["navigate", "data_exchange"]).optional(),
            navigate_screen: z.string().optional(),
          }),
        ),
      }),
    ]),
  ),
  language: z.string(),
  category: z.enum(WaTemplateCategory),
  allow_category_change: z.boolean().optional().nullable(),
};
const waTemplateInputSchema = z.object(waTemplateInput);
export const waTemplateFormattedInputSchema = z.object(waTemplateFormattedInput);

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
  templateType: z.enum(TemplateType).optional(),
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
  whatsappSettingsPhoneId: z.string(),
});

const syncTemplatesSchema = z.object({
  whatsappSettingsPhoneIds: z.array(z.string()).min(1),
});

export type CreateWaTemplateInput = z.infer<typeof waTemplateInputSchema>;
export type CreateWaTemplateFormattedInput = z.infer<typeof waTemplateFormattedInputSchema>;
export type WaTemplate = z.infer<typeof waTemplateSchema>;
export type WaTemplateFormatted = z.infer<typeof waTemplateFormattedSchema>;
export type ByTemplateIdParamsSchema = z.infer<typeof byTemplateIdParamsSchema>;
export type TemplateTypeParamsSchema = z.infer<typeof templateTypeParamsSchema>;
export type RegisterTemplatesInDbBodySchema = z.infer<typeof registerTemplatesInDbBodySchema>;
export type WaUserSendTemplateBodySchema = z.infer<typeof waUserSendTemplateBodySchema>;

// Auto-exported after fastify-zod migration
export {
  waTemplateInputSchema,
  waTemplateSchema,
  byTemplateIdParamsSchema,
  templateTypeParamsSchema,
  registerTemplatesInDbBodySchema,
  waUserSendTemplateBodySchema,
  syncTemplatesSchema,
};

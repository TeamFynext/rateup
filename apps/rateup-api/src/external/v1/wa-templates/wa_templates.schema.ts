import { z } from "zod";
import {
  WaButtonType,
  WaTemplateCategory,
  WaTemplateComponentType,
  WaTemplateSupportedFormats,
} from "../../../types/enums.js";

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
        flow_action: z.enum(["navigate", "data_exchange"]).optional(),
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
        text: z.string().max(60),
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
};
const waTemplateInputSchema = z.object(waTemplateInput);
export const waTemplateFormattedInputSchema = z.object(waTemplateFormattedInput);
export const sendWithFileSchema = z.object({
  timeDelay: z.coerce.number().int().min(15).optional(),
  templateName: z.string(),
  phone: z.coerce.number(),
  body_variables: z
    .preprocess((val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return [];
        }
      }
      return val;
    }, z.array(z.coerce.string()))
    .optional()
    .describe("Array of variables for the template body. Example: ['variable1','variable2']"),
  teamId: z.string().optional(),
  tag: z.string().optional(),
  headerType: z.string().optional(),
  filename: z.string().optional(),
  file: z
    .union([
      z.string(), // for binary
      z.object({}).loose(), // for object
    ])
    .optional(),
  buttonVariable: z.string().optional(),
  from: z.string().optional().describe("WhatsApp phone number with country code (e.g. 1234567890)"),
  quickReplyPayload: z
    .preprocess((val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return [];
        }
      }
      return val;
    }, z.array(z.coerce.string()))
    .optional()
    .describe(
      "Array of payloads for quick reply buttons, if the template has quick reply buttons. The order of payloads should match the order of quick reply buttons in the template.",
    ),
});

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
  phone: z.coerce.number(),
  parameterData: z.any(),
  teamId: z.string().optional(),
});

export type CreateWaTemplateInput = z.infer<typeof waTemplateInputSchema>;
export type CreateWaTemplateFormattedInput = z.infer<typeof waTemplateFormattedInputSchema>;
export type WaTemplate = z.infer<typeof waTemplateSchema>;
export type WaTemplateFormatted = z.infer<typeof waTemplateFormattedSchema>;
export type ByTemplateIdParamsSchema = z.infer<typeof byTemplateIdParamsSchema>;
export type RegisterTemplatesInDbBodySchema = z.infer<typeof registerTemplatesInDbBodySchema>;
export type WaUserSendTemplateBodySchema = z.infer<typeof waUserSendTemplateBodySchema>;

export type SendWithFileSchema = z.infer<typeof sendWithFileSchema>;

// Auto-exported after fastify-zod migration
export {
  waTemplateInputSchema,
  waTemplateSchema,
  byTemplateIdParamsSchema,
  byTemplateIdParamsWithOrg,
  registerTemplatesInDbBodySchema,
  waUserSendTemplateBodySchema,
};

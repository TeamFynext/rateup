import { z } from "zod";
import { WaTemplateStatus } from "../../../../types/enums";
import {
  WHATSAPP_BUTTON_TYPE,
  WHATSAPP_TEMPLATE_BROADCAST_TYPE,
} from "../../../../utils/constants";
import { isValidPhoneNumber } from "react-phone-number-input";

const MB_BYTES = 1000000; // Number of bytes in a megabyte.

const ACCEPTED_MIME_TYPES = [
  "image/png",
  "image/jpg",
  "image/jpeg",
  "application/pdf",
];
export const templateSchema = z
  .object({
    name: z
      .string()
      .regex(/^[a-z_0-9]+$/, {
        message: "Name can only have lower-case letters and underscores",
      })
      .trim()
      .min(1)
      .max(512),
    body: z.string().trim().min(1).max(1024),
    footer: z.string().trim().max(60),
    language: z.string(),
    header: z.union([
      z.null(),
      z.string().trim().min(1),
      z.instanceof(File).superRefine((f, ctx) => {
        if (!ACCEPTED_MIME_TYPES.includes(f.type)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `File must be one of [${ACCEPTED_MIME_TYPES.join(
              ", ",
            )}] but was ${f.type}`,
          });
        }
        if (f.size > 5 * MB_BYTES) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_big,
            type: "array",
            message: `The file must not be larger than ${5 * MB_BYTES} bytes: ${
              f.size
            }`,
            maximum: 5 * MB_BYTES,
            inclusive: true,
          });
        }
      }),
    ]),
    format: z.string(),
    category: z.string(),
    buttons: z
      .array(
        z.object({
          text: z.string().max(25).optional(),
          type: z.string(),
          example: z
            .string()
            .max(15)
            .refine((text) => !text.includes(" "), {
              message: "Name cannot contain spaces",
            })
            .optional(),
          phone_number: z
            .string()
            .max(25)
            .refine(isValidPhoneNumber)
            .optional(),
          url: z.string().trim().url().max(2000).optional(),
          flow_id: z.string().optional(),
          flow_action: z.string().optional(),
          navigate_screen: z.string().optional(),
        }),
      )
      .max(10),
    status: z.nativeEnum(WaTemplateStatus),
    example: z.array(z.string().trim()).optional(),
  })
  .superRefine((values, ctx) => {
    const format = values.format;
    const value = values.header;
    let errorMessage = "";
    const videoType = ["video/mp4"];
    const imageType = ["image/png", "image/jpg", "image/jpeg"];
    const documentType = ["video/mp4"];
    values.buttons?.map((data, index) => {
      if (data.text?.trim()?.length === 0) {
        ctx.addIssue({
          path: ["buttons", index, "text"],
          code: z.ZodIssueCode.custom,
          message: "Button text is required",
        });
      }
      switch (data.type) {
        case WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE:
          if (!data.url) {
            ctx.addIssue({
              path: ["buttons", index, "url"],
              code: z.ZodIssueCode.custom,
              message: "website url is required",
            });
          }
          break;
        case WHATSAPP_BUTTON_TYPE.COPY_OFFER_CODE:
          if (!data.example) {
            ctx.addIssue({
              path: ["buttons", index, "example"],
              code: z.ZodIssueCode.custom,
              message: "Offer code is required",
            });
          }
          break;
        case WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER:
          if (!isValidPhoneNumber(data?.phone_number ?? "")) {
            ctx.addIssue({
              path: ["buttons", index, "phone_number"],
              code: z.ZodIssueCode.custom,
              message: "Invalid phone number",
            });
          }
          break;

        default:
          break;
      }
    });

    const typeNotString = typeof value !== "string";
    if (format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE && typeNotString) {
      errorMessage =
        !imageType.includes(value?.type) &&
        `Incorrect Type use only ${imageType?.join(",")}`;
    } else if (
      format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.VIDEO &&
      typeNotString
    ) {
      errorMessage =
        !videoType.includes(value?.type) &&
        `Incorrect Type use only ${videoType?.join(",")}`;
    } else if (
      format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.DOCUMENT &&
      typeNotString
    ) {
      errorMessage =
        !documentType.includes(value?.type) &&
        `Incorrect Type use only ${documentType?.join(",")}`;
    }
    if (errorMessage)
      ctx.addIssue({
        path: ["header"],
        code: z.ZodIssueCode.custom,
        message: errorMessage,
      });
  });

export type WaTemplateDefaultValues = {
  image?: {
    link: string;
  };
};

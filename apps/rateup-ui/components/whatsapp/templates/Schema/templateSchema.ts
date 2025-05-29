import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";

import {
  OrderType,
  TemplateType,
  WaTemplateStatus,
} from "../../../../types/enums";
import {
  WHATSAPP_BUTTON_TYPE,
  WHATSAPP_TEMPLATE_BROADCAST_TYPE,
} from "../../../../utils/constants";

const MB_BYTES = 1000000; // Number of bytes in a megabyte.
const FILE_SIZE = 10;

const ACCEPTED_MIME_TYPES = [
  "image/png",
  "image/jpg",
  "image/jpeg",
  "application/pdf",
  "video/mp4",
];
export const configSchema = z.object({
  price: z.number().min(0),
  tax: z.number().min(0),
  orderType: z.nativeEnum(OrderType).nullable().optional(),
  name: z.string().min(1).max(60),
});
export const templateSchema = z
  .object({
    name: z
      .string()
      .regex(/^[a-z_0-9]+$/, {
        message: "Name can only have lower-case letters and underscores",
      })
      .trim()
      .min(1, { message: "Template Name required" })
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
        if (f.size > FILE_SIZE * MB_BYTES) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_big,
            type: "array",
            message: `The file must not be larger than ${FILE_SIZE} MB`,
            maximum: FILE_SIZE * MB_BYTES,
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
          example: z.union([
            z
              .string()
              .max(15)
              .refine((text) => !text.includes(" "), {
                message: "Name cannot contain spaces",
              })
              .optional(),
            z.array(
              z
                .string()
                .trim()
                .min(1)
                .max(2000)
                .refine((text) => !text.includes(" "), {
                  message: "websurvey example cannot contain spaces",
                }),
            ),
          ]),
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
    templateType: z.nativeEnum(TemplateType),
    mediaCarousel: z
      .array(
        z.object({
          body: z.string().trim().min(1).max(1024),
          header: z.union([
            z.null(),
            z.string().trim().min(1),
            z.instanceof(File).superRefine((f, ctx) => {
              const allowed = [
                "image/png",
                "image/jpg",
                "image/jpeg",
                "video/mp4",
              ];
              if (!allowed.includes(f.type)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `File must be one of [${allowed.join(
                    ", ",
                  )}] but was ${f.type}`,
                });
              }
              if (f.size > FILE_SIZE * MB_BYTES) {
                ctx.addIssue({
                  code: z.ZodIssueCode.too_big,
                  type: "array",
                  message: `The file must not be larger than ${FILE_SIZE} MB`,
                  maximum: FILE_SIZE * MB_BYTES,
                  inclusive: true,
                });
              }
            }),
          ]),
          format: z.string(),
          example: z.array(z.string().trim()).optional(),
          buttons: z
            .array(
              z.object({
                text: z.string().max(25),
                type: z.string(),
                example: z.array(z.string().trim().min(1).max(2000)).optional(),
                phone_number: z
                  .string()
                  .max(25)
                  .refine(isValidPhoneNumber)
                  .optional(),
                url: z.string().trim().url().max(2000).optional(),
              }),
            )
            .max(2)
            .min(1),
        }),
      )
      .max(10, "Only upto 10 cards can be added")
      .min(2, "Minimum 2 cards should be there")
      .optional(),
    productCarousel: z.union([
      z.null(),
      z.object({
        button: z.object({
          text: z.string().max(25),
          type: z.string(),
          example: z.array(z.string().trim().min(1).max(2000)),
          url: z.string().trim().url().max(2000).optional(),
        }),
        products: z.array(z.string()).max(10).min(2),
      }),
    ]),
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
                  z.object({
                    title: z.string(),
                    products: z.array(z.string()),
                  }),
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
      })
      .optional(),
  })
  .superRefine((values, ctx) => {
    const format = values.format;
    const value = values.header;
    let errorMessage = "";
    const videoType = ["video/mp4"];
    const imageType = ["image/png", "image/jpg", "image/jpeg"];
    const documentType = [...imageType, ...videoType, "application/pdf"];
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
        case WHATSAPP_BUTTON_TYPE.MPM:
          let errormsg;

          if (values.defaultValues.catalog.mpm.sections.length > 10) {
            errormsg = "Sections cannot be more than 10";
          } else if (
            values.defaultValues.catalog.mpm.sections.some(
              (s) => s.products.length > 30,
            )
          ) {
            errormsg = "Each sections can have only upto 30 products";
          } else if (
            values.defaultValues.catalog.mpm.sections.some(
              (s) => !s.title.length || !s.products.length,
            )
          ) {
            errormsg = "Fill out the sections";
          } else if (format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.NONE) {
            ctx.addIssue({
              path: ["header"],
              code: z.ZodIssueCode.custom,
              message: "Header is required for templates with a MPM button",
            });
          }
          if (errormsg) {
            ctx.addIssue({
              path: ["button", index],
              code: z.ZodIssueCode.custom,
              message: "Fill out the sections",
            });
          }
          break;
        case WHATSAPP_BUTTON_TYPE.SPM:
          if (!values.defaultValues.catalog.spm.product_retailer_id) {
            ctx.addIssue({
              path: ["buttons", index],
              code: z.ZodIssueCode.custom,
              message: "product retailer id required",
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
    } else if (format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT && !value) {
      errorMessage = "Header Text Needed";
    }
    if (errorMessage)
      ctx.addIssue({
        path: ["header"],
        code: z.ZodIssueCode.custom,
        message: errorMessage,
      });

    if (
      values.templateType === TemplateType.CAROUSEL &&
      values.mediaCarousel.length
    ) {
      values.mediaCarousel.map((card, index) => {
        const cardHeaerTypeNotString = typeof card.header !== "string";
        if (!card.body.length) {
          ctx.addIssue({
            path: ["mediaCarousel", index],
            code: z.ZodIssueCode.custom,
            message: "Every card should have body",
          });
        } else if (!card.header) {
          ctx.addIssue({
            path: ["mediaCarousel", index],
            code: z.ZodIssueCode.custom,
            message: "Every card should have header",
          });
        } else if (
          card.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE &&
          cardHeaerTypeNotString
        ) {
          let msg =
            !imageType.includes((card.header as File)?.type) &&
            `Incorrect Type use only ${imageType?.join(",")}`;
          ctx.addIssue({
            path: ["mediaCarousel", index],
            code: z.ZodIssueCode.custom,
            message: msg,
          });
        } else if (
          format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.VIDEO &&
          cardHeaerTypeNotString
        ) {
          let msg =
            !videoType.includes((card.header as File)?.type) &&
            `Incorrect Type use only ${videoType?.join(",")}`;
          ctx.addIssue({
            path: ["mediaCarousel", index],
            code: z.ZodIssueCode.custom,
            message: msg,
          });
        }
      });
    }
  });

export type WaTemplateDefaultValues = {
  image?: {
    link: string;
  };
};

import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod/v4";

import { OrderType, TemplateType, WaTemplateStatus } from "@/types/enums.ts";
import { WHATSAPP_BUTTON_TYPE, WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "@/utils/constants.ts";

const MB_BYTES = 1000000; // Number of bytes in a megabyte.
const FILE_SIZE = 50;

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
  orderType: z.enum(OrderType).nullable().optional(),
  name: z.string().min(1).max(60),
});

const allowedMimesforMediaCarousel = ["image/png", "image/jpg", "image/jpeg", "video/mp4"];

/** A file's type as a customer would name it: "image/avif" → "AVIF". */
const fileKind = (file: File) =>
  (file.type.split("/")[1] || file.name.split(".").pop() || "unknown").toUpperCase();

const mimeTypeMaxSizes: Record<string, number> = {
  // Audio
  "audio/aac": 16 * 1024 * 1024,
  "audio/amr": 16 * 1024 * 1024,
  "audio/mpeg": 16 * 1024 * 1024,
  "audio/mp4": 16 * 1024 * 1024,
  "audio/ogg": 16 * 1024 * 1024,
  // Document
  "text/plain": 100 * 1024 * 1024,
  "application/vnd.ms-excel": 100 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": 100 * 1024 * 1024,
  "application/msword": 100 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 100 * 1024 * 1024,
  "application/vnd.ms-powerpoint": 100 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": 100 * 1024 * 1024,
  "application/pdf": 100 * 1024 * 1024,
  // Image
  "image/jpeg": 5 * 1024 * 1024,
  "image/png": 5 * 1024 * 1024,
  // Sticker
  "image/webp": 500 * 1024,
  // Video
  "video/3gpp": 16 * 1024 * 1024,
  "video/mp4": 16 * 1024 * 1024,
};

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
    code_expiration_minutes: z.number().optional(),
    // The File checks sit after the union, not inside it: when every union branch fails,
    // the form reports the first branch's error ("expected null, received File") and the
    // file-type message is lost.
    header: z.union([z.null(), z.string().trim().min(1), z.instanceof(File)]).check((ctx) => {
      if (!(ctx.value instanceof File)) return;
      const maxSize = mimeTypeMaxSizes?.[ctx.value?.type];
      if (!ACCEPTED_MIME_TYPES.includes(ctx.value.type)) {
        ctx.issues.push({
          input: "",
          code: "invalid_type",
          expected: "custom",
          message: `${fileKind(ctx.value)} files aren't supported. Use a PNG or JPG image, an MP4 video or a PDF.`,
        });
      }
      if (maxSize && ctx.value.size > maxSize) {
        ctx.issues.push({
          input: "",
          code: "too_big",
          message: `This file is too large. ${fileKind(ctx.value)} files can be up to ${Math.round(maxSize / 1024 / 1024)} MB.`,
          maximum: maxSize,
          inclusive: true,
          origin: "file",
        });
      }
    }),
    format: z.string(),
    category: z.string(),
    buttons: z
      .array(
        z.object({
          text: z.string().max(25).optional(),
          type: z.string(),
          example: z
            .union([
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
            ])
            .optional(),
          phone_number: z.string().max(25).refine(isValidPhoneNumber).optional(),
          url: z.string().trim().max(2000).optional(),
          flow_id: z.string().optional(),
          flow_action: z.string().optional(),
          navigate_screen: z.string().optional(),
          /** Authentication templates: how the OTP button delivers the code. */
          otp_type: z.string().optional(),
        }),
      )
      .max(10),
    status: z.enum(WaTemplateStatus),
    example: z.array(z.string().trim()).optional(),
    templateType: z.enum(TemplateType),
    whatsappSettingsPhoneId: z.string().optional(),
    mediaCarousel: z
      .array(
        z.object({
          body: z
            .string()
            .trim()
            .min(1, { message: "Card body is required" })
            .max(1024, { message: "Card body can be at most 1024 characters" }),
          // File checks after the union, as for the template header above.
          header: z.union([z.null(), z.string().trim().min(1), z.instanceof(File)]).check((ctx) => {
            if (!(ctx.value instanceof File)) return;
            if (!allowedMimesforMediaCarousel.includes(ctx.value.type)) {
              ctx.issues.push({
                input: ctx.value,
                code: "custom",
                message: `${fileKind(ctx.value)} files aren't supported. Use a PNG or JPG image, or an MP4 video.`,
              });
            }
            if (ctx.value.size > FILE_SIZE * MB_BYTES) {
              ctx.issues.push({
                input: ctx.value,
                code: "custom",
                message: `This file is too large. Card files can be up to ${FILE_SIZE} MB.`,
              });
            }
          }),
          format: z.string(),
          example: z.array(z.string().trim()).optional(),
          buttons: z
            .array(
              z.object({
                text: z
                  .string()
                  .trim()
                  .min(1, { message: "Enter the button text" })
                  .max(25, { message: "Button text can be at most 25 characters" }),
                type: z.string(),
                example: z.array(z.string().trim().min(1).max(2000)).optional(),
                phone_number: z
                  .string()
                  .max(25)
                  .refine(isValidPhoneNumber, {
                    message: "Enter a valid phone number with country code",
                  })
                  .optional(),
                // Trimmed before the URL check, as the deprecated `z.string().trim().url()` did.
                url: z
                  .string()
                  .trim()
                  .max(2000)
                  .pipe(z.url({ message: "Enter a valid website URL" }))
                  .optional(),
              }),
            )
            .max(2, { message: "Each card can have at most 2 buttons" })
            .min(1, { message: "Each card needs at least 1 button" }),
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
            // Trimmed before the URL check, as the deprecated `z.string().trim().url()` did.
            url: z.string().trim().max(2000).pipe(z.url()).optional(),
          }),
          product_retailer_id: z.string(),
        }),
      )
      .optional(),
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
            catalogId: z.string(),
          })
          .optional(),
        whatsappSettingsPhoneId: z.string().optional(),
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
  })
  .check((ctx) => {
    const { value: values, issues } = ctx;
    const format = values.format;
    const value = values.header;
    // The type checks below assign `false` when the media type is acceptable.
    let errorMessage: string | false = "";
    const videoType = ["video/mp4"];
    const imageType = ["image/png", "image/jpg", "image/jpeg"];
    const documentType = [...imageType, ...videoType, "application/pdf"];
    values.buttons?.map((data, index) => {
      if (data.text?.trim()?.length === 0) {
        issues.push({
          path: ["buttons", index, "text"],
          code: "custom",
          message: "Enter the button text",
          input: values,
        });
      }
      switch (data.type) {
        case WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE:
          if (!data.url) {
            issues.push({
              path: ["buttons", index, "url"],
              code: "custom",
              message: "Enter the website URL for this button",
              input: data.url,
            });
          } else {
            // If URL contains template variable like {{1}}, require example and validate
            if (typeof data.url === "string" && /{{\s*\d+\s*}}/.test(data.url)) {
              const example = data.example;
              const hasExample = Array.isArray(example)
                ? example.length > 0
                : typeof example === "string" && example.trim().length > 0;
              if (!hasExample) {
                issues.push({
                  path: ["buttons", index, "example"],
                  code: "custom",
                  message: "Example value is required when URL contains a variable",
                  input: data.example,
                });
              }
              // Try replacing placeholders with a simple value to validate URL structure
              try {
                const replaced = data.url.replace(/{{\s*\d+\s*}}/g, "1");
                // Use URL constructor to validate

                new URL(replaced);
              } catch {
                issues.push({
                  path: ["buttons", index, "url"],
                  code: "custom",
                  message: "Enter a valid website URL, e.g. https://example.com",
                  input: data.url,
                });
              }
            } else {
              // When no template placeholders present, validate a normal URL
              try {
                new URL(data.url);
              } catch {
                issues.push({
                  path: ["buttons", index, "url"],
                  code: "custom",
                  message: "Enter a valid website URL, e.g. https://example.com",
                  input: data.url,
                });
              }
            }
          }
          break;
        case WHATSAPP_BUTTON_TYPE.COPY_OFFER_CODE:
          if (!data.example) {
            issues.push({
              input: data.example,
              code: "custom",
              message: "Offer code is required",
              path: ["buttons", index, "example"],
            });
          }
          break;
        case WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER:
          if (!isValidPhoneNumber(data?.phone_number ?? "")) {
            issues.push({
              input: data?.phone_number,
              code: "custom",
              message: "Enter a valid phone number with country code",
              path: ["buttons", index, "phone_number"],
            });
          }
          break;
        case WHATSAPP_BUTTON_TYPE.MPM:
          let errormsg;
          if (!values.defaultValues?.whatsappSettingsPhoneId?.length) {
            errormsg = "Catalog linked Whatsapp account is required";
          } else if (values.defaultValues!.catalog!.mpm!.sections.length > 10) {
            errormsg = "Sections cannot be more than 10";
          } else if (
            values.defaultValues!.catalog!.mpm!.sections.some((s) => s.products.length > 30)
          ) {
            errormsg = "Each sections can have only upto 30 products";
          } else if (
            values.defaultValues!.catalog!.mpm!.sections.some(
              (s) => !s.title.length || !s.products.length,
            )
          ) {
            errormsg = "Fill out the sections";
          } else if (format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.NONE) {
            issues.push({
              input: format,
              path: ["header"],
              code: "custom",
              message: "Header is required for templates with a MPM button",
            });
          }
          if (errormsg) {
            issues.push({
              input: "",
              path: ["buttons", index],
              code: "custom",
              message: "Fill out the sections",
            });
          }
          break;
        case WHATSAPP_BUTTON_TYPE.SPM:
          if (!values.defaultValues?.whatsappSettingsPhoneId?.length) {
            errormsg = "Catalog linked Whatsapp account is required";
          } else if (!values.defaultValues!.catalog!.spm!.product_retailer_id) {
            issues.push({
              input: "",
              path: ["buttons", index],
              code: "custom",
              message: "Choose a product for this button",
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
        !imageType.includes(value?.type ?? "") &&
        "The header is set to Image, so choose a PNG or JPG file.";
    } else if (format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.VIDEO && typeNotString) {
      errorMessage =
        !videoType.includes(value?.type ?? "") &&
        "The header is set to Video, so choose an MP4 file.";
    } else if (format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.DOCUMENT && typeNotString) {
      errorMessage =
        !documentType.includes(value?.type ?? "") &&
        "The header is set to Document, so choose a PDF, PNG, JPG or MP4 file.";
    } else if (format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT && !value) {
      errorMessage = "Enter the header text.";
    }
    if (errorMessage)
      issues.push({
        path: ["header"],
        code: "custom",
        message: errorMessage || "",
        input: "",
      });

    if (values.templateType === TemplateType.CAROUSEL && values.mediaCarousel!.length) {
      if (values.mediaCarousel!.length < 2) {
        issues.push({
          path: ["mediaCarousel"],
          code: "custom",
          message: "Add at least 2 cards to the carousel.",
          input: "",
        });
        return;
      }
      values.mediaCarousel!.map((card, index) => {
        const cardHeaerTypeNotString = typeof card.header !== "string";
        if (!card.body.length) {
          issues.push({
            path: ["mediaCarousel", index],
            code: "custom",
            message: "Card body is required",
            input: "",
          });
        } else if (!card.header) {
          issues.push({
            path: ["mediaCarousel", index],
            code: "custom",
            message: "Choose an image or video for this card.",
            input: "",
          });
        } else if (
          card.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE &&
          cardHeaerTypeNotString
        ) {
          // Only push on a real mismatch: an issue with an empty message still fails the
          // parse, and zod shows it as a bare "Invalid input".
          if (!imageType.includes((card.header as File)?.type)) {
            issues.push({
              path: ["mediaCarousel", index],
              code: "custom",
              message: "This card is set to Image, so choose a PNG or JPG file.",
              input: "",
            });
          }
        } else if (
          card.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.VIDEO &&
          cardHeaerTypeNotString
        ) {
          if (!videoType.includes((card.header as File)?.type)) {
            issues.push({
              path: ["mediaCarousel", index],
              code: "custom",
              message: "This card is set to Video, so choose an MP4 file.",
              input: "",
            });
          }
        } else if (!card.buttons.length) {
          issues.push({
            path: ["mediaCarousel", index],
            code: "custom",
            message: "Each card needs at least 1 button",
            input: "",
          });
        }
      });
    }

    if (values.templateType === TemplateType.CAROUSEL && values.productCarousel!.length) {
      if (values.productCarousel!.length < 2) {
        issues.push({
          path: ["productCarousel"],
          code: "custom",
          message: "Add at least 2 cards to the carousel.",
          input: "",
        });
        return;
      }
      const buttonType = values.productCarousel![0]!.button.type;
      values.productCarousel!.map((card, index) => {
        if (card.button.type !== buttonType) {
          issues.push({
            path: ["productCarousel", index],
            code: "custom",
            message: "Every card must use the same button action as card 1",
            input: "",
          });
          return;
        }
      });
    }
  });

export interface WaTemplateDefaultValues {
  image?: { link: string; filename?: string };
  video?: { link: string; filename?: string };
  document?: { link: string; filename?: string };
}

// Extracted verbatim from `util.ts`. Behaviour is unchanged.

import dayjs from "dayjs";
import { z } from "zod/v4";

import { QuestionType2, WaQuestions } from "@/types/enums.ts";

export const getValidationSchema = (type: QuestionType2) => {
  let schema: z.ZodRawShape = {};
  switch (type) {
    case QuestionType2.TextInput:
      schema = {
        type: z.string(),
        label: z.string().trim().min(1).max(20),
        name: z.string(),
        "input-type": z.string(),
        required: z.boolean(),
        "min-chars": z.number().optional(),
        "max-chars": z.number().optional(),
        "helper-text": z.string().max(80).optional(),
        "init-value": z.string().optional(),
        visible: z.boolean(),
        header: z.string().max(4090).optional(), // UI metadata, converted to TextBody by backend
      };
      break;
    case QuestionType2.TextArea:
      schema = {
        type: z.string(),
        label: z.string().trim().min(1).max(20),
        required: z.boolean(),
        "max-length": z.number().max(600),
        name: z.string(),
        "helper-text": z.string().max(80).optional(),
        "init-value": z.string().optional(),
        visible: z.boolean(),
        header: z.string().max(4090).optional(), // UI metadata, converted to TextBody by backend
      };
      break;
    case QuestionType2.CheckboxGroup:
      schema = {
        type: z.string(),
        "data-source": z
          .array(
            z.object({
              id: z.string(),
              title: z.string().max(30),
              description: z.string().max(300).optional(),
              metadata: z.string().max(20).optional(),
              image: z.string().optional(),
              "alt-text": z.string().optional(),
              color: z.string().optional(),
            }),
          )
          .min(1, { message: "At least one option is required" })
          .max(20, { message: "Maximum 20 options allowed" }),
        name: z.string(),
        "min-selected-items": z.number().optional(),
        "max-selected-items": z.number().optional(),
        label: z.string().trim().min(1).max(30),
        required: z.boolean(),
        description: z.string().max(300).optional(),
        "init-value": z.array(z.string()).optional(),
        "media-size": z.enum(["regular", "large"]).optional(),
        visible: z.boolean(),
        header: z.string().max(4090).optional(), // UI metadata, converted to TextBody by backend
      };
      break;
    case QuestionType2.RadioButtonsGroup:
    case QuestionType2.LD:
    case QuestionType2.YN:
      schema = {
        type: z.string(),
        "data-source": z
          .array(
            z.object({
              id: z.string(),
              title: z.string().max(30),
              description: z.string().max(300).optional(),
              metadata: z.string().max(20).optional(),
              image: z.string().optional(),
              "alt-text": z.string().optional(),
              color: z.string().optional(),
            }),
          )
          .min(1, { message: "At least one option is required" })
          .max(20, { message: "Maximum 20 options allowed" }),
        name: z.string(),
        label: z.string().trim().min(1).max(30),
        required: z.boolean(),
        description: z.string().max(300).optional(),
        "init-value": z.string().optional(),
        "media-size": z.enum(["regular", "large"]).optional(),
        visible: z.boolean(),
        header: z.string().max(4090).optional(), // UI metadata, converted to TextBody by backend
      };
      break;
    case QuestionType2.Footer:
      schema = {
        type: z.string(),
        label: z.string().trim().min(1).max(35),
        "left-caption": z.string().max(15).optional(),
        // "center-caption": z.string().max(15).optional(),
        "right-caption": z.string().max(15).optional(),
      };
      break;
    case QuestionType2.OptIn:
      schema = {
        type: z.literal(WaQuestions.OptIn),
        label: z.string().trim().min(1).max(35),
        required: z.boolean(),
        name: z.string(),
        "init-value": z.boolean().optional(),
        visible: z.boolean(),
      };
      break;
    case QuestionType2.Dropdown:
    case QuestionType2.Rating:
    case QuestionType2.Smiley:
    case QuestionType2.Opinion:
      schema = {
        type: z.string(),
        label: z.string().trim().min(1).max(20),
        "data-source": z
          .array(
            z.object({
              id: z.string(),
              title: z.string().max(30),
              description: z.string().max(300).optional(),
              metadata: z.string().max(20).optional(),
              image: z.string().optional(),
              "alt-text": z.string().optional(),
              color: z.string().optional(),
            }),
          )
          .min(1, { message: "At least one option is required" })
          .max(200, { message: "Maximum 200 options allowed" }),
        required: z.boolean(),
        "init-value": z.string().optional(),
        visible: z.boolean(),
        header: z.string().max(4090).optional(), // UI metadata, converted to TextBody by backend
      };
      break;
    case QuestionType2.DatePicker:
      schema = {
        type: z.string(),
        label: z.string().trim().min(1).max(40),
        "min-date": z.date().optional().nullable(),
        "max-date": z.date().optional().nullable(),
        name: z.string(),
        "unavailable-dates": z.array(z.date().optional().nullable()),
        "helper-text": z.string().max(80).optional(),
        "init-value": z.string().optional(),
        visible: z.boolean(),
        header: z.string().max(4090).optional(), // UI metadata, converted to TextBody by backend
      };
      break;

    case QuestionType2.Image:
      schema = {
        type: z.string(),
        src: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
        "scale-type": z.enum(["cover", "contain"]).optional().default("contain"),
        "aspect-ratio": z.number().optional().default(1),
        "alt-text": z.string().optional(),
      };
      break;
    case QuestionType2.ImageCarousel:
      schema = {
        type: z.string(),
        images: z
          .array(
            z.object({
              src: z.string().min(1, "Image required"),
              "alt-text": z.string().trim().min(1, "Alt text required"),
            }),
          )
          .min(1, { message: "At least one image is required" })
          .max(3, { message: "Maximum 3 images allowed" }),
        "aspect-ratio": z.enum(["4:3", "16:9"]).default("4:3"),
        "scale-type": z.enum(["contain", "cover"]).default("contain"),
      };
      break;
    case QuestionType2.PhotoPicker:
      schema = {
        type: z.string(),
        name: z.string(),
        label: z.string().trim().min(1).max(80),
        description: z.string().max(300).optional(),
        "photo-source": z.enum(["camera_gallery", "camera", "gallery"]).default("camera_gallery"),
        "max-file-size-kb": z.number().min(1).max(25600).default(25600),
        "min-uploaded-photos": z.number().min(0).max(30).default(0),
        "max-uploaded-photos": z.number().min(1).max(30).default(30),
        visible: z.boolean(),
      };
      break;
    case QuestionType2.DocumentPicker:
      schema = {
        type: z.string(),
        name: z.string(),
        label: z.string().trim().min(1).max(80),
        description: z.string().max(300).optional(),
        "max-file-size-kb": z.number().min(1).max(25600).default(25600),
        "min-uploaded-documents": z.number().min(0).max(30).default(0),
        "max-uploaded-documents": z.number().min(1).max(30).default(30),
        "allowed-mime-types": z
          .array(
            z.enum([
              "application/gzip",
              "application/msword",
              "application/pdf",
              "application/vnd.ms-excel",
              "application/vnd.ms-powerpoint",
              "application/vnd.oasis.opendocument.presentation",
              "application/vnd.oasis.opendocument.spreadsheet",
              "application/vnd.oasis.opendocument.text",
              "application/vnd.openxmlformats-officedocument.presentationml.presentation",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "application/x-7z-compressed",
              "application/zip",
              "image/avif",
              "image/gif",
              "image/heic",
              "image/heif",
              "image/jpeg",
              "image/png",
              "image/tiff",
              "image/webp",
              "text/plain",
              "video/mp4",
              "video/mpeg",
            ]),
          )
          .optional(),
        visible: z.boolean(),
      };
      break;
    case QuestionType2.TextBody:
      schema = {
        type: z.string(),
        text: z.string().trim().min(1).max(4096),
        visible: z.boolean(),
      };
      break;
    case QuestionType2.TextCaption:
      schema = {
        type: z.string(),
        text: z.string().trim().min(1).max(409),
        visible: z.boolean(),
      };
      break;
    case QuestionType2.TextHeading:
      schema = {
        type: z.string(),
        text: z.string().trim().min(1).max(80),
        visible: z.boolean(),
      };
      break;
    case QuestionType2.TextSubheading:
      schema = {
        type: z.string(),
        text: z.string().trim().min(1).max(80),
        visible: z.boolean(),
      };
      break;
    case QuestionType2.RichText:
      schema = {
        type: z.literal("RichText"),
        text: z.union([z.string().trim().min(1), z.array(z.string()).min(1)]),
      };
      break;
    case QuestionType2.EmbeddedLink:
      schema = {
        type: z.literal(WaQuestions.EmbeddedLink),
        text: z.string().trim().min(1).max(25),
        url: z.url(),
        visible: z.boolean(),
      };
      break;
    case QuestionType2.ChipsSelector:
      schema = {
        type: z.literal(WaQuestions.ChipsSelector),
        "data-source": z
          .array(
            z.object({
              id: z.string(),
              title: z.string().max(30),
            }),
          )
          .min(2, { message: "At least two option is required" })
          .max(20, { message: "Maximum 20 options allowed" }),
        name: z.string(),
        "min-selected-items": z.number().optional(),
        "max-selected-items": z.number().optional(),
        label: z.string().trim().min(1).max(80),
        required: z.boolean(),
        description: z.string().max(300).optional(),
        "init-value": z.array(z.string()).optional(),
        visible: z.boolean(),
      };
      break;
  }
  return z.object(schema).check((ctx) => {
    const { value: data } = ctx;
    if (data["visible"] === false) {
      if (data["required"]) {
        ctx.issues.push({
          code: "custom",
          message: "If the component is hidden, it cannot be required",
          path: ["visible"],
          input: data["visible"],
        });
      }
    }
    if (data["min-date"] || data["max-date"]) {
      // The bounds are stored as ISO date strings; anything else is not a bound.
      const minDate = typeof data["min-date"] === "string" ? data["min-date"] : undefined;
      const maxDate = typeof data["max-date"] === "string" ? data["max-date"] : undefined;
      (data["unavailable-dates"] as Date[]).forEach((date) => {
        if (date && dayjs(date).isBefore(minDate)) {
          ctx.issues.push({
            code: "custom",
            message: "Unavailable dates must be after min-date",
            path: ["unavailable-dates"],
            input: data["unavailable-dates"],
          });
        }
        if (date && dayjs(date).isAfter(maxDate)) {
          ctx.issues.push({
            code: "custom",
            message: "Unavailable dates must be before max-date",
            path: ["unavailable-dates"],
            input: data["unavailable-dates"],
          });
        }
      });
    }
    if (data["min-selected-items"] && data["max-selected-items"]) {
      if (data["min-selected-items"] > data["max-selected-items"]) {
        ctx.issues.push({
          code: "custom",
          message: "Min selected items should be less than max selected items",
          path: ["min-selected-items"],
          input: "",
        });
      }
    }
    if (data["url"] && !(data["url"] as string).startsWith("https")) {
      ctx.issues.push({
        code: "custom",
        message: "URL must start with https",
        path: ["url"],
        input: "",
      });
    }
  });
};

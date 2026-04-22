import dayjs from "dayjs";
import { z } from "zod/v4";

import {
  LDResponse2,
  QuestionType2,
  RatingScale,
  SmileyResponse2,
  WaQuestions,
  YNResponse,
} from "@/types/enums";

export const getValidationSchema = (type: QuestionType2) => {
  let schema = {};
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
        "scale-type": z
          .enum(["cover", "contain"])
          .optional()
          .default("contain"),
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
        "photo-source": z
          .enum(["camera_gallery", "camera", "gallery"])
          .default("camera_gallery"),
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
      (data["unavailable-dates"] as Date[]).forEach((date) => {
        if (date && dayjs(date).isBefore(data["min-date"])) {
          ctx.issues.push({
            code: "custom",
            message: "Unavailable dates must be after min-date",
            path: ["unavailable-dates"],
            input: data["unavailable-dates"],
          });
        }
        if (date && dayjs(date).isAfter(data["max-date"])) {
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

type InitialValues = {
  [key: string]: {
    type: string;
    value:
      | string
      | number
      | boolean
      | string[]
      | { id: string; title: string }[];
    extra?: any;
    metaType?: string;
  };
};

export const getInitialValues = (type: QuestionType2) => {
  let initialValues: InitialValues = {};
  const validation = getValidationSchema(type);
  const shape: any = validation?.shape;
  const LABEL_MAX = shape?.label?.def?.checks?.find(
    (data) => data?._zod?.def?.check === "max_length",
  )?._zod?.def?.maximum;

  const DESC_MAX = shape?.description?.def?.checks?.find(
    (data) => data?._zod?.def?.check === "max_length",
  )?._zod?.def?.maximum;
  const TEXT_MAX = shape?.text?.def?.checks?.find(
    (data) => data?._zod?.def?.check === "max_length",
  )?._zod?.def?.maximum;

  const TITLE_MAX = 4090;
  const HELPER_TEXT_MAX = 80;
  const generateId = crypto.randomUUID().replace(/-/g, "_");
  switch (type) {
    case QuestionType2.TextInput:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.TextInput },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        header: {
          type: "richText",
          value: "",
          extra: { max: TITLE_MAX },
        },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
            max: LABEL_MAX,
          },
        },
        "input-type": {
          type: "select",
          value: "text",
          extra: {
            data: ["text", "number", "email", "password", "passcode", "phone"],
            allowDeselect: false,
            disabled: type !== QuestionType2.TextInput,
          },
        },
        required: { type: "hidden", value: true },
        "min-chars": { type: "number", value: 0 },
        "max-chars": { type: "number", value: 80 },
        "helper-text": {
          type: "text",
          value: "",
          extra: { max: HELPER_TEXT_MAX },
        },
        name: { type: "hidden", value: generateId },
        "init-value": { type: "init", value: "" },
        visible: {
          type: "checkbox",
          value: true,
          extra: {
            size: "lg",
            onMessage: "press to hide the component",
            offMessage: "press to display the component",
          },
        },
      };
      break;
    case QuestionType2.TextArea:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.TextArea },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        header: {
          type: "richText",
          value: "",
          extra: { max: TITLE_MAX },
        },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
            max: LABEL_MAX,
          },
        },
        required: { type: "hidden", value: true },
        "max-length": { type: "number", value: 600 },
        name: { type: "hidden", value: generateId },
        "helper-text": {
          type: "text",
          value: "",
          extra: { max: HELPER_TEXT_MAX },
        },
        "init-value": { type: "init", value: "" },
        visible: {
          type: "checkbox",
          value: true,
          extra: {
            size: "lg",
            onMessage: "press to hide the component",
            offMessage: "press to display the component",
          },
        },
        enableNpsAnalytics: { type: "hidden", value: false },
      };
      break;
    case QuestionType2.CheckboxGroup:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.CheckboxGroup },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        name: { type: "hidden", value: generateId },
        header: {
          type: "richText",
          value: "",
          extra: { max: TITLE_MAX },
        },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
            max: LABEL_MAX,
          },
        },
        required: { type: "hidden", value: true },
        description: {
          type: "text",
          value: "",
          extra: {
            max: DESC_MAX,
          },
        },
        "min-selected-items": { type: "number", value: 1 },
        "init-value": { type: "text", value: [] },
        "media-size": {
          type: "select",
          value: "regular",
          extra: {
            data: ["regular", "large"],
            defaultValue: "regular",
          },
        },
        visible: {
          type: "checkbox",
          value: true,
          extra: {
            size: "lg",
            onMessage: "press to hide the component",
            offMessage: "press to display the component",
          },
        },
        "data-source": {
          type: "dataSource",
          value: getDataSource(type),
        },
        enableNpsAnalytics: { type: "hidden", value: false },
      };
      break;
    case QuestionType2.RadioButtonsGroup:
    case QuestionType2.LD:
    case QuestionType2.YN:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.RadioButtonsGroup },
        header: {
          type: "richText",
          value: "",
          extra: { max: TITLE_MAX },
        },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        name: { type: "hidden", value: generateId },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
            max: LABEL_MAX,
          },
        },
        required: { type: "hidden", value: true },
        description: {
          type: "text",
          value: "",
          extra: {
            max: DESC_MAX,
          },
        },
        "init-value": { type: "init", value: "" },
        "media-size": {
          type: "select",
          value: "regular",
          extra: {
            data: ["regular", "large"],
            defaultValue: "regular",
          },
        },
        visible: {
          type: "checkbox",
          value: true,
          extra: {
            size: "lg",
            onMessage: "press to hide the component",
            offMessage: "press to display the component",
          },
        },
        "data-source": {
          type: "dataSource",
          value: getDataSource(type),
        },
        enableNpsAnalytics: { type: "hidden", value: false },
      };
      break;
    case QuestionType2.Footer:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.Footer },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
            max: LABEL_MAX,
          },
        },
        "left-caption": { type: "text", value: "" },
        // "center-caption": { type: "text", value: "" },
        "right-caption": { type: "text", value: "" },
      };
      break;
    case QuestionType2.OptIn:
      initialValues = {
        id: { type: "hidden", value: generateId },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        type: { type: "hidden", value: WaQuestions.OptIn },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
            max: LABEL_MAX,
          },
        },
        required: { type: "hidden", value: true },
        name: { type: "hidden", value: generateId },
        visible: {
          type: "checkbox",
          value: true,
          extra: {
            size: "lg",
            onMessage: "press to hide the component",
            offMessage: "press to display the component",
            mt: "xl",
          },
        },
        "init-value": { type: "hidden", value: false },
      };
      break;
    case QuestionType2.Dropdown:
    case QuestionType2.Rating:
    case QuestionType2.Smiley:
    case QuestionType2.Opinion:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.Dropdown },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        header: {
          type: "richText",
          value: "",
          extra: { max: TITLE_MAX },
        },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
            max: LABEL_MAX,
          },
        },
        required: { type: "hidden", value: true },
        "init-value": { type: "init", value: "" },
        visible: {
          type: "checkbox",
          value: true,
          extra: {
            size: "lg",
            onMessage: "press to hide the component",
            offMessage: "press to display the component",
          },
        },
        "data-source": {
          type: "dataSource",
          value: getDataSource(type),
        },
        name: { type: "hidden", value: generateId },
        enableNpsAnalytics: { type: "hidden", value: false },
      };
      break;
    case QuestionType2.DatePicker:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.DatePicker },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        header: {
          type: "richText",
          value: "",
          extra: { max: TITLE_MAX },
        },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
            max: LABEL_MAX,
          },
        },
        "min-date": {
          type: "date",
          value: null,
          extra: {
            clearable: true,
          },
        },
        "max-date": {
          type: "date",
          value: null,
          extra: {
            clearable: true,
          },
        },
        name: { type: "hidden", value: generateId },
        "unavailable-dates": {
          type: "date",
          value: [],
          extra: {
            type: "multiple",
            clearable: true,
          },
        },
        "helper-text": {
          type: "text",
          value: "",
          extra: { max: HELPER_TEXT_MAX },
        },
        "init-value": { type: "init", value: "" },
        visible: {
          type: "checkbox",
          value: true,
          extra: {
            size: "lg",
            onMessage: "press to hide the component",
            offMessage: "press to display the component",
          },
        },
        enableNpsAnalytics: { type: "hidden", value: false },
      };
      break;
    case QuestionType2.Image:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.Image },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        src: { type: "image", value: "" },
        width: { type: "number", value: 300 },
        height: { type: "number", value: 200 },
        "scale-type": {
          type: "select",
          value: "contain",
          extra: {
            data: ["cover", "contain"],
            defaultValue: "contain",
          },
        },
        "aspect-ratio": { type: "number", value: 1 },
        "alt-text": { type: "text", value: "" },
      };
      break;
    case QuestionType2.ImageCarousel:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.ImageCarousel },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        images: {
          type: "imageCarousel",
          value: [],
          extra: {
            maxImages: 3,
            aspectRatioOptions: ["4:3", "16:9"],
            scaleTypeOptions: ["contain", "cover"],
          },
        },
        "aspect-ratio": {
          type: "select",
          value: "4:3",
          extra: { data: ["4:3", "16:9"] },
        },
        "scale-type": {
          type: "select",
          value: "contain",
          extra: { data: ["contain", "cover"] },
        },
      };
      break;
    case QuestionType2.PhotoPicker:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.PhotoPicker },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        name: { type: "hidden", value: generateId },
        header: {
          type: "richText",
          value: "",
          extra: { max: TITLE_MAX },
        },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
            max: LABEL_MAX,
          },
        },
        description: {
          type: "text",
          value: "",
          extra: {
            max: DESC_MAX,
          },
        },
        "photo-source": {
          type: "select",
          value: "camera_gallery",
          extra: {
            data: ["camera_gallery", "camera", "gallery"],
            defaultValue: "camera_gallery",
          },
        },
        "max-file-size-kb": { type: "number", value: 25600 },
        "min-uploaded-photos": { type: "number", value: 1 },
        "max-uploaded-photos": { type: "number", value: 1 },
        visible: {
          type: "checkbox",
          value: true,
          extra: {
            size: "lg",
            onMessage: "press to hide the component",
            offMessage: "press to display the component",
          },
        },
      };
      break;
    case QuestionType2.DocumentPicker:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.DocumentPicker },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        name: { type: "hidden", value: generateId },
        header: {
          type: "richText",
          value: "",
          extra: { max: TITLE_MAX },
        },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
            max: LABEL_MAX,
          },
        },
        description: {
          type: "text",
          value: "",
          extra: {
            max: DESC_MAX,
          },
        },
        "max-file-size-kb": { type: "number", value: 25600 },
        "min-uploaded-documents": { type: "number", value: 1 },
        "max-uploaded-documents": { type: "number", value: 1 },
        "allowed-mime-types": {
          type: "multiselect",
          value: [
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
          ],
        },
        visible: {
          type: "checkbox",
          value: true,
          extra: {
            size: "lg",
            onMessage: "press to hide the component",
            offMessage: "press to display the component",
            mt: "xl",
          },
        },
      };
      break;
    case QuestionType2.TextBody:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.TextBody },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        text: {
          type: "richText",
          value: "",
          extra: { required: true, max: TEXT_MAX },
        },

        markdown: { type: "hidden", value: true },
        visible: {
          type: "checkbox",
          value: true,
          extra: {
            size: "lg",
            onMessage: "press to hide the component",
            offMessage: "press to display the component",
            mt: "xl",
          },
        },
      };
      break;
    case QuestionType2.TextCaption:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.TextCaption },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        text: {
          type: "richText",
          value: "",
          extra: { required: true, max: TEXT_MAX },
        },
        markdown: { type: "hidden", value: true },
        visible: {
          type: "checkbox",
          value: true,
          extra: {
            size: "lg",
            onMessage: "press to hide the component",
            offMessage: "press to display the component",
            mt: "xl",
          },
        },
      };
      break;
    case QuestionType2.TextHeading:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.TextHeading },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        text: {
          type: "text",
          value: "",
          extra: { required: true, max: TEXT_MAX },
        },
        visible: {
          type: "checkbox",
          value: true,
          extra: {
            size: "lg",
            onMessage: "press to hide the component",
            offMessage: "press to display the component",
            mt: "xl",
          },
        },
      };
      break;
    case QuestionType2.TextSubheading:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.TextSubheading },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        text: {
          type: "text",
          value: "",
          extra: { required: true, max: TEXT_MAX },
        },
        visible: {
          type: "checkbox",
          value: true,
          extra: {
            size: "lg",
            onMessage: "press to hide the component",
            offMessage: "press to display the component",
            mt: "xl",
          },
        },
      };
      break;
    case QuestionType2.RichText:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.RichText },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        text: { type: "richText", value: "", extra: { required: true } },
        visible: {
          type: "checkbox",
          value: true,
          extra: {
            size: "lg",
            onMessage: "press to hide the component",
            offMessage: "press to display the component",
          },
        },
      };
      break;
    case QuestionType2.EmbeddedLink:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.EmbeddedLink },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        text: { type: "text", value: "", extra: { required: true, max: 25 } },
        url: {
          type: "text",
          value: "",
          extra: { required: true, type: "url" },
        },
        visible: {
          type: "checkbox",
          value: true,
          extra: {
            size: "lg",
            onMessage: "press to hide the component",
            offMessage: "press to display the component",
          },
        },
      };
      break;
    case QuestionType2.ChipsSelector:
      initialValues = {
        id: { type: "hidden", value: generateId },
        type: { type: "hidden", value: WaQuestions.ChipsSelector },
        metaType: {
          type: "hidden",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        name: { type: "hidden", value: generateId },
        header: {
          type: "richText",
          value: "",
          extra: { max: TITLE_MAX },
        },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
            max: LABEL_MAX,
          },
        },
        required: { type: "hidden", value: true },
        description: {
          type: "text",
          value: "",
          extra: {
            max: DESC_MAX,
          },
        },
        "min-selected-items": { type: "number", value: 1 },
        "max-selected-items": { type: "number", value: 2 },
        "init-value": { type: "text", value: [] },
        visible: {
          type: "checkbox",
          value: true,
          extra: {
            size: "lg",
            onMessage: "press to hide the component",
            offMessage: "press to display the component",
          },
        },
        "data-source": {
          type: "dataSource",
          value: getDataSource(type),
          extra: { onlyTitle: true },
        },
        enableNpsAnalytics: { type: "hidden", value: false },
      };
      break;
    default:
      initialValues = {};
      break;
  }
  return initialValues;
};

const getDataSource = (type: QuestionType2) => {
  const mapEnumToDataSource = (enumObj: object) =>
    Object.values(enumObj).map((value, index) => ({
      id: (index + 1).toString(),
      title: value,
    }));

  switch (type) {
    case QuestionType2.Rating:
      return Object.entries(RatingScale).map(([description, title], index) => ({
        id: (index + 1).toString(),
        title,
        description,
      }));
    case QuestionType2.Smiley:
      return mapEnumToDataSource(SmileyResponse2);
    case QuestionType2.LD:
      return mapEnumToDataSource(LDResponse2);
    case QuestionType2.YN:
      return mapEnumToDataSource(YNResponse);
    case QuestionType2.Opinion:
      return Array.from({ length: 10 }).map((_, index) => ({
        id: (index + 1).toString(),
        title: (index + 1).toString(),
      }));
    case QuestionType2.ChipsSelector:
      return [];
    default:
      return [];
  }
};

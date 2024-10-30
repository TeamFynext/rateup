import { z } from "zod";

import { QuestionType2 } from "@/types/enums";

export const getValidationSchema = (type: QuestionType2) => {
  let schema = {};
  switch (type) {
    case QuestionType2.TextInput:
    case QuestionType2.Email:
    case QuestionType2.Phone:
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
        description: z.string().optional(),
        "init-value": z.array(z.string()).optional(),
        "media-size": z.enum(["regular", "large"]).optional(),
      };
      break;
    case QuestionType2.RadioButtonsGroup:
    case QuestionType2.Rating:
    case QuestionType2.Smiley:
    case QuestionType2.LD:
    case QuestionType2.YN:
    case QuestionType2.Opinion:
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
        description: z.string().optional(),
        "init-value": z.string().optional(),
        "media-size": z.enum(["regular", "large"]).optional(),
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
        type: z.literal("OptIn"),
        label: z.string().trim().min(1).max(35),
        required: z.boolean(),
        name: z.string(),
        "init-value": z.boolean().optional(),
      };
      break;
    case QuestionType2.Dropdown:
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
              enabled: z.boolean(),
              image: z.string().optional(),
              "alt-text": z.string().optional(),
              color: z.string().optional(),
            }),
          )
          .min(1, { message: "At least one option is required" })
          .max(300, { message: "Maximum 300 options allowed" }),
        required: z.boolean(),
        "init-value": z.string().optional(),
      };
    case QuestionType2.DatePicker:
      schema = {
        type: z.string(),
        label: z.string().trim().min(1).max(40),
        "min-date": z
          .date()
          .transform((d) => d.toISOString().split("T")[0])
          .optional()
          .nullable(),
        "max-date": z
          .date()
          .transform((d) => d.toISOString().split("T")[0])
          .optional()
          .nullable(),
        name: z.string(),
        "unavailable-dates": z.array(
          z
            .date()
            .transform((d) => d.toISOString().split("T")[0])
            .optional()
            .nullable(),
        ),
        "helper-text": z.string().max(80).optional(),
        "init-value": z.string().optional(),
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
      };
      break;
    case QuestionType2.RichText:
      schema = {
        type: z.literal("RichText"),
        text: z.union([z.string().trim().min(1), z.array(z.string()).min(1)]),
      };
  }
  return z.object(schema);
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
  };
};

export const getInitialValues = (type: QuestionType2) => {
  let initialValues: InitialValues = {};
  const generateId = Math.random().toString(36).substr(2, 9);
  switch (type) {
    case QuestionType2.TextInput:
    case QuestionType2.Email:
    case QuestionType2.Phone:
      initialValues = {
        id: { type: "text", value: generateId },
        type: { type: "text", value: "TextInput" },
        metaType: {
          type: "text",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
          },
        },
        "input-type": {
          type: "select",
          value:
            type === QuestionType2.Email
              ? "email"
              : type === QuestionType2.Phone
                ? "phone"
                : "text",
          extra: {
            data: ["text", "number", "email", "password", "passcode", "phone"],
            defaultValue:
              type === QuestionType2.Email
                ? "email"
                : type === QuestionType2.Phone
                  ? "phone"
                  : "text",
            disabled: type !== QuestionType2.TextInput,
          },
        },
        required: { type: "checkbox", value: true },
        "min-chars": { type: "number", value: 0 },
        "max-chars": { type: "number", value: 80 },
        "helper-text": { type: "text", value: "" },
        name: { type: "text", value: generateId },
        "init-value": { type: "text", value: "" },
      };
      break;
    case QuestionType2.TextArea:
      initialValues = {
        id: { type: "text", value: generateId },
        type: { type: "text", value: "TextArea" },
        metaType: {
          type: "text",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
          },
        },
        required: { type: "checkbox", value: true },
        "max-length": { type: "number", value: 600 },
        name: { type: "text", value: generateId },
        "helper-text": { type: "text", value: "" },
        "init-value": { type: "text", value: "" },
        enableNpsAnalytics: { type: "checkbox", value: false },
      };
      break;
    case QuestionType2.CheckboxGroup:
      initialValues = {
        id: { type: "text", value: generateId },
        type: { type: "text", value: "CheckboxGroup" },
        metaType: {
          type: "text",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        name: { type: "text", value: generateId },
        "min-selected-items": { type: "number", value: 0 },
        "max-selected-items": { type: "number", value: 1 },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
          },
        },
        required: { type: "checkbox", value: true },
        description: { type: "text", value: "" },
        "init-value": { type: "text", value: [] },
        "media-size": {
          type: "select",
          value: "regular",
          extra: {
            data: ["regular", "large"],
            defaultValue: "regular",
          },
        },
        "data-source": {
          type: "dataSource",
          value: getDataSource(type),
        },
        enableNpsAnalytics: { type: "checkbox", value: false },
      };
      break;
    case QuestionType2.RadioButtonsGroup:
    case QuestionType2.Rating:
    case QuestionType2.Smiley:
    case QuestionType2.LD:
    case QuestionType2.YN:
    case QuestionType2.Opinion:
      initialValues = {
        id: { type: "text", value: generateId },
        type: { type: "text", value: "RadioButtonsGroup" },
        metaType: {
          type: "text",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        name: { type: "text", value: generateId },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
          },
        },
        required: { type: "checkbox", value: true },
        description: { type: "text", value: "" },
        "init-value": { type: "text", value: "" },
        "media-size": {
          type: "select",
          value: "regular",
          extra: {
            data: ["regular", "large"],
            defaultValue: "regular",
          },
        },
        "data-source": {
          type: "dataSource",
          value: getDataSource(type),
        },
        enableNpsAnalytics: { type: "checkbox", value: false },
      };
      break;
    case QuestionType2.Footer:
      initialValues = {
        id: { type: "text", value: generateId },
        type: { type: "text", value: "Footer" },
        metaType: {
          type: "text",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
          },
        },
        "left-caption": { type: "text", value: "" },
        // "center-caption": { type: "text", value: "" },
        "right-caption": { type: "text", value: "" },
      };
      break;
    case QuestionType2.OptIn:
      initialValues = {
        id: { type: "text", value: generateId },
        metaType: {
          type: "text",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        type: { type: "text", value: "OptIn" },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
          },
        },
        required: { type: "checkbox", value: true },
        name: { type: "text", value: generateId },
        "init-value": { type: "checkbox", value: false },
      };
      break;
    case QuestionType2.Dropdown:
      initialValues = {
        id: { type: "text", value: generateId },
        type: { type: "text", value: "Dropdown" },
        metaType: {
          type: "text",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
          },
        },
        required: { type: "checkbox", value: true },
        "init-value": { type: "text", value: "" },
        "data-source": {
          type: "dataSource",
          value: getDataSource(type),
        },
        enableNpsAnalytics: { type: "checkbox", value: false },
      };
      break;
    case QuestionType2.DatePicker:
      initialValues = {
        id: { type: "text", value: generateId },
        type: { type: "text", value: "DatePicker" },
        metaType: {
          type: "text",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
          },
        },
        "min-date": { type: "date", value: null },
        "max-date": { type: "date", value: null },
        name: { type: "text", value: generateId },
        "unavailable-dates": { type: "multiselect", value: [] },
        "helper-text": { type: "text", value: "" },
        "init-value": { type: "text", value: "" },
        enableNpsAnalytics: { type: "checkbox", value: false },
      };
      break;
    case QuestionType2.Image:
      initialValues = {
        id: { type: "text", value: generateId },
        type: { type: "text", value: "Image" },
        metaType: {
          type: "text",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        src: { type: "text", value: "" },
        width: { type: "number", value: 0 },
        height: { type: "number", value: 0 },
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
    case QuestionType2.PhotoPicker:
      initialValues = {
        id: { type: "text", value: generateId },
        type: { type: "text", value: "PhotoPicker" },
        metaType: {
          type: "text",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        name: { type: "text", value: generateId },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
          },
        },
        description: { type: "text", value: "" },
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
      };
      break;
    case QuestionType2.DocumentPicker:
      initialValues = {
        id: { type: "text", value: generateId },
        type: { type: "text", value: "DocumentPicker" },
        metaType: {
          type: "text",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        name: { type: "text", value: generateId },
        label: {
          type: "text",
          value: "",
          extra: {
            required: true,
          },
        },
        description: { type: "text", value: "" },
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
      };
      break;
    case QuestionType2.RichText:
      initialValues = {
        id: { type: "text", value: generateId },
        type: { type: "text", value: "RichText" },
        metaType: {
          type: "text",
          value: Object.keys(QuestionType2).find(
            (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
          ),
        },
        text: { type: "richText", value: "", extra: { required: true } },
      };
      break;
  }
  return initialValues;
};

const getDataSource = (type: QuestionType2) => {
  switch (type) {
    case QuestionType2.Rating:
      return [
        {
          id: "5",
          title: "★★★★★• Excellent (5/5)",
        },
        {
          id: "4",
          title: "★★★★☆• Good (4/5)",
        },
        {
          id: "3",
          title: "★★★☆☆• Average (3/5)",
        },
        {
          id: "2",
          title: "★★☆☆☆• Poor (2/5)",
        },
        {
          id: "1",
          title: "★☆☆☆☆• Very Poor (1/5)",
        },
      ];
    case QuestionType2.Smiley:
      return [
        {
          id: "1",
          title: "😡",
        },
        {
          id: "2",
          title: "😕",
        },
        {
          id: "3",
          title: "😐",
        },
        {
          id: "4",
          title: "😊",
        },
        {
          id: "5",
          title: "😃",
        },
      ];

    case QuestionType2.LD:
      return [
        {
          id: "1",
          title: "👍",
        },
        {
          id: "2",
          title: "👎",
        },
      ];
    case QuestionType2.YN:
      return [
        {
          id: "1",
          title: "Yes",
        },
        {
          id: "2",
          title: "No",
        },
      ];
    case QuestionType2.Opinion:
      return [
        {
          id: "1",
          title: "1",
        },
        {
          id: "2",
          title: "2",
        },
        {
          id: "3",
          title: "3",
        },
        {
          id: "4",
          title: "4",
        },
        {
          id: "5",
          title: "5",
        },
        {
          id: "6",
          title: "6",
        },
        {
          id: "7",
          title: "7",
        },
        {
          id: "8",
          title: "8",
        },
        {
          id: "9",
          title: "9",
        },
        {
          id: "10",
          title: "10",
        },
      ];
    default:
      return [];
  }
};

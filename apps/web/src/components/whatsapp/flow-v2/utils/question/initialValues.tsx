// Extracted verbatim from `util.ts`. Behaviour is unchanged.

import { QuestionType2, WaQuestions } from "@/types/enums.ts";

import { getDataSource } from "./dataSource.tsx";
import { maxLengthOf } from "./shared.tsx";
import type { InitialValues } from "./shared.tsx";
import { getValidationSchema } from "./validationSchema.tsx";

export const getInitialValues = (type: QuestionType2) => {
  let initialValues: InitialValues = {};
  const validation = getValidationSchema(type);
  const shape = validation?.shape;
  const LABEL_MAX = maxLengthOf(shape.label);
  const DESC_MAX = maxLengthOf(shape.description);
  const TEXT_MAX = maxLengthOf(shape.text);

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

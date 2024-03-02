import { QuestionType, WaFlowFormElementType as wft } from "../types/enums";

export const imagesPath = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images`;
export const surveyUploadsPath = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}`;

export const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const ContactQuestions = [
  QuestionType.Contact,
  QuestionType.Email,
  QuestionType.Phone,
  // QuestionType.EmailPhone,
];

export const WaContactQuestions = [QuestionType.Email, QuestionType.Phone];

export const NPSQuestions = [
  QuestionType.Rating,
  QuestionType.Smiley,
  QuestionType.LD,
  QuestionType.YN,
  QuestionType.Opinion,
  QuestionType.CustomNPS,
];

export const WaNPSQuestions = [
  QuestionType.Rating,
  QuestionType.Smiley,
  QuestionType.LD,
  QuestionType.YN,
  QuestionType.Opinion,
  QuestionType.CustomNPS,
];
export const FlowNpsQ = [
  QuestionType.Rating,
  QuestionType.Smiley,
  QuestionType.LD,
  QuestionType.YN,
  QuestionType.Opinion,
];
export const OtherQuestions = [
  QuestionType.Text,
  QuestionType.TextArea,
  QuestionType.Number,
  QuestionType.DateTime,
  QuestionType.Photo,
  QuestionType.Testimonial,
  QuestionType.MCQ,
  QuestionType.MSQ,
  QuestionType.DDSS,
  QuestionType.DDMS,
  QuestionType.PCQ,
  QuestionType.TnC,
];

export const WaOtherQuestions = [
  QuestionType.Text,
  QuestionType.Number,
  QuestionType.MCQ,
  QuestionType.DateTime,
  QuestionType.Photo,
  QuestionType.Testimonial,
];
const FlowOtherQuestions = [
  QuestionType.Text,
  QuestionType.MCQ,
  QuestionType.MSQ,
  QuestionType.DDSS,
  QuestionType.DateTime,
];

export const WaExclusive = [QuestionType.WaList, QuestionType.WaButtons];

export const QuestionTypesGroup = [
  { title: "Contact Questions", questionTypes: ContactQuestions },
  { title: "NPS Questions", questionTypes: NPSQuestions },
  { title: "Other Questions", questionTypes: OtherQuestions },
];

export const WaSurveyQuestionTypes = [
  { title: "Contact Questions", questionTypes: WaContactQuestions },
  { title: "NPS Questions", questionTypes: WaNPSQuestions },
  { title: "Other Questions", questionTypes: WaOtherQuestions },
  { title: "WhatsApp Exclusive Questions", questionTypes: WaExclusive },
];
const flowNonInputElements = [
  wft.textHeading,
  wft.textSubHeading,
  wft.textBody,
  wft.textCaption,
  wft.image,
];
export const FlowQuestionTypes = [
  // also includes non-input elements like text & links
  { title: "Contact Questions", questionTypes: WaContactQuestions },
  { title: "NPS Questions", questionTypes: FlowNpsQ },
  { title: "Other Questions", questionTypes: FlowOtherQuestions },
  { title: "Non-Input Elements", questionTypes: flowNonInputElements },
];

export const ChoiceTypeQuestions = [
  QuestionType.MCQ,
  QuestionType.MSQ,
  QuestionType.DDMS,
  QuestionType.DDSS,
  QuestionType.CustomNPS,
  QuestionType.WaButtons,
];

export const fallbackImage = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/no_image_template.jpeg`;

export const mimeTypesForImage: { [key: string]: string } = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "application/svg+xml",
};

export const MAX_FILE_SIZE_IN_MB = 10;
export const MAX_FILE_SIZE_IN_BYTE = MAX_FILE_SIZE_IN_MB * 1024 * 1024;
export const THUMBNAIL_URL = "thumb300x200-";

export const PAGE_SIZE = ["50", "100", "200", "500"];

export const SAVE_HOTKEY = "mod+s";

export const COORDINATESX = ["LEFT", "CENTER", "RIGHT"];
export const COORDINATESY = ["TOP", "MIDDLE", "BOTTOM", "DEFAULT"];

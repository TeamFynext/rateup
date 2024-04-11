import { QuestionType, WaFlowFormElementType as wft } from "../types/enums";

export const imagesPath = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images`;
export const surveyUploadsPath = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}`;

export const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const ContactQuestions = [
  QuestionType.Contact,
  QuestionType.Email,
  QuestionType.Phone,
  // QuestionType.EmailPhone,
  QuestionType.Address,
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

export const ChoiceQuestions = [
  QuestionType.MCQ,
  QuestionType.MSQ,
  QuestionType.DDSS,
  QuestionType.DDMS,
  QuestionType.PCQ,
];

export const InputQuestions = [
  QuestionType.Text,
  QuestionType.TextArea,
  QuestionType.Number,
  QuestionType.Date,
  QuestionType.Photo,
];

export const OtherQuestions = [
  QuestionType.Testimonial,
  QuestionType.TnC,
  QuestionType.InfoMessage,
];

export const WaOtherQuestions = [
  QuestionType.Text,
  QuestionType.Number,
  QuestionType.MCQ,
  QuestionType.Date,
  QuestionType.Photo,
  QuestionType.Testimonial,
];

export const FlowChoiceQuestions = [
  QuestionType.MCQ,
  QuestionType.MSQ,
  QuestionType.DDSS,
];

const FlowInputQuestions = [
  QuestionType.Text,
  QuestionType.TextArea,
  QuestionType.Date,
];

export const WaExclusive = [QuestionType.WaList, QuestionType.WaButtons];

export const QuestionTypesGroup = [
  { title: "Contact Questions", questionTypes: ContactQuestions },
  { title: "NPS Questions", questionTypes: NPSQuestions },
  { title: "Choice Questions", questionTypes: ChoiceQuestions },
  { title: "Input Questions", questionTypes: InputQuestions },
  { title: "Other Questions", questionTypes: OtherQuestions },
];

export const WaSurveyQuestionTypes = [
  { title: "Contact Questions", questionTypes: WaContactQuestions },
  { title: "NPS Questions", questionTypes: WaNPSQuestions },
  { title: "Other Questions", questionTypes: WaOtherQuestions },
  { title: "WhatsApp Exclusive Questions", questionTypes: WaExclusive },
];
const flowNonInputElements = [
  wft.nonInputText,
  wft.image,
  // not currectly working
  // , wft.embeddedLink,wft.optIn
];
export const FlowQuestionTypes = [
  // also includes non-input elements like text & links
  { title: "Contact Questions", questionTypes: WaContactQuestions },
  { title: "NPS Questions", questionTypes: FlowNpsQ },
  { title: "Choice Questions", questionTypes: FlowChoiceQuestions },
  { title: "Input Questions", questionTypes: FlowInputQuestions },
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
export const whatsappOptions = ["templates"];
export const WHATSAPP_TEMPLATE_CATEGORY = [
  "MARKETING",
  "UTILITY",
  "AUTHENTICATION",
];
export enum WHATSAPP_TEMPLATE_BROADCAST_TYPE {
  NONE = "NONE",
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  DOCUMENT = "DOCUMENT",
  LOCATION = "LOCATION",
}

export enum WHATSAPP_BUTTON_TYPE {
  QUICK_REPLY = "QUICK_REPLY",
  COPY_OFFER_CODE = "COPY_CODE",
  CALL_PHONE_NUMBER = "PHONE_NUMBER",
  VISIT_WEBSITE = "URL",
}

export const MIN_AMOUNT_ERROR = "Total Purchase Amount not eligable for Gift";
export const MIN_PHONE_ERROR =
  "body/phoneNumber must NOT have fewer than 10 characters";
export const MAX_PHONE_ERROR =
  "body/phoneNumber must NOT have more than 10 characters";
export const INTERNAL_ERROR = "Something Went Wrong! Try again.";
export const INTERNAL_ERROR2 = "There was an error, please try again later";
export const AXIOS_TIMEOUT = "Request timed out";

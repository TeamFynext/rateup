import { QuestionType, WaFlowFormElementType as wft } from "../types/enums";

export const imagesPath = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images`;
export const surveyUploadsPath = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}`;

export const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const ContactQuestions = [
  QuestionType.Email,
  QuestionType.Phone,
  QuestionType.EmailPhone,
  QuestionType.Contact,
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

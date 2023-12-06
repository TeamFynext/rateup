import { QuestionType } from "../types/enums";

export const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const ContactQuestions = [
  QuestionType.Email,
  QuestionType.Phone,
  QuestionType.EmailPhone,
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

export const colorMapping = {
  1: { c: "rgba(255, 92, 85, 1)", bg: "rgba(255, 92, 85, 0.2)" },
  2: { c: "rgba(255, 133, 128, 1)", bg: "rgba(255, 133, 128, 0.2)" },
  3: { c: "rgba(254, 183, 92, 1)", bg: "rgba(254, 183, 92, 0.2)" },
  4: { c: "rgba(254, 201, 133, 1)", bg: "rgba(254, 201, 133, 0.2)" },
  5: { c: "rgba(254, 220, 78, 1)", bg: "rgba(254, 220, 78, 0.2)" },
  6: { c: "rgba(254, 229, 122, 1)", bg: "rgba(254, 229, 122, 0.2)" },
  7: { c: "rgba(188, 234, 116, 1)", bg: "rgba(188, 234, 116, 0.2)" },
  8: { c: "rgba(166, 227, 70, 1)", bg: "rgba(166, 227, 70, 0.2)" },
  9: { c: "rgba(125, 203, 140, 1)", bg: "rgba(125, 203, 140, 0.2)" },
  10: { c: "rgba(82, 186, 102, 1)", bg: "rgba(82, 186, 102, 0.2)" },
};

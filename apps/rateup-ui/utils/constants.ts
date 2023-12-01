import { QuestionType } from "../types/enums";

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

import { QuestionType } from "../types/enums";

export const ContactQuestions = [QuestionType.Email, QuestionType.Phone];

export const WaContactQuestions = [QuestionType.Email, QuestionType.Phone];

export const NPSQuestions = [
  QuestionType.LD,
  QuestionType.YN,
  QuestionType.Rating,
  QuestionType.Smiley,
  QuestionType.Opinion,
];

export const WaNPSQuestions = [
  QuestionType.LD,
  QuestionType.YN,
  QuestionType.Smiley,
  QuestionType.Opinion,
];

export const OtherQuestions = [
  QuestionType.Text,
  QuestionType.TextArea,
  QuestionType.DDMS,
  QuestionType.Number,
  QuestionType.Testimonial,
  QuestionType.DDSS,
  QuestionType.Photo,
  QuestionType.DateTime,
  QuestionType.MCQ,
  QuestionType.MSQ,
];

export const WaOtherQuestions = [
  QuestionType.Text,
  QuestionType.Number,
  QuestionType.Testimonial,
  QuestionType.Photo,
  QuestionType.DateTime,
  QuestionType.MCQ,
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

import { QuestionType as Q, QuestionType } from "../types/enums";
export const validationSupportedTypes = [
  Q.Text,
  Q.TextArea,
  Q.Number,
  Q.MultiTextInput,
];
export const googleReviewSupportedTypes = [Q.Rating, Q.Smiley, Q.Opinion];
export const ticketIssueSupportedTypes = [Q.Rating, Q.Smiley, Q.Opinion];
export const logicSupportedTypes = Object.values(Q);

import {
  QuestionType as Q,
  QuestionType2 as Q2,
  QuestionType2,
  WaQuestions as W,
} from "../types/enums";

export const validationSupportedTypes = [
  Q.Text,
  Q.TextArea,
  Q.Number,
  Q.MultiTextInput,
  Q.Optin,
];
export const googleReviewSupportedTypes = [Q.Rating, Q.Smiley, Q.Opinion];
export const googleReviewSupportedTypes2 = [Q2.Rating, Q2.Smiley, Q2.Opinion];

export const ticketIssueSupportedTypes = [Q.Rating, Q.Smiley, Q.Opinion];
export const logicSupportedTypes = Object.values(Q);
export const logicSupportedTypes2 = [
  W.Rating,
  W.Smiley,
  W.Opinion,
  W.CheckboxGroup,
  W.DatePicker,
  W.Dropdown,
  W.LD,
  W.YN,
  W.TextInput,
  W.TextArea,
  W.RadioButtonsGroup,
  W.OptIn,
  W.DocumentPicker,
  W.PhotoPicker,
];
export const logicSupportedTypes3 = [
  QuestionType2.Rating,
  QuestionType2.Smiley,
  QuestionType2.Opinion,
  QuestionType2.CheckboxGroup,
  QuestionType2.DatePicker,
  QuestionType2.Dropdown,
  QuestionType2.LD,
  QuestionType2.YN,
  QuestionType2.TextInput,
  QuestionType2.TextArea,
  QuestionType2.RadioButtonsGroup,
  QuestionType2.OptIn,
  QuestionType2.DocumentPicker,
  QuestionType2.PhotoPicker,
];

import { QuestionType as Q, QuestionType2 } from "@/types/enums.ts";

export const validationSupportedTypes = [Q.Text, Q.TextArea, Q.Number, Q.MultiTextInput, Q.Optin];
export const googleReviewSupportedTypes = [Q.Rating, Q.Smiley, Q.Opinion];

export const ticketIssueSupportedTypes = Object.values(Q);

export const logicSupportedTypes = Object.values(Q);

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
  QuestionType2.ChipsSelector,
];

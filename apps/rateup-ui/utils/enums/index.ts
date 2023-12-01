import { QuestionType } from "../../types/enums";

export const AuthMode = {
  VERIFY: "VERIFY",
  LOGIN: "LOGIN",
  SIGNUP: "SIGNUP",
};

export const UserMode = {
  GUEST: "GUEST",
};

export const UserRole = {
  SUPADM: "SUPER_ADMIN",
  ADM: "ADMIN",
  MEMBER: "MEMBER",
};

export const ResetSteps = {
  STEP_ONE: "STEP_ONE",
  STEP_TWO: "STEP_TWO",
  STEP_THREE: "STEP_THREE",
};

export const contactAddType = {
  NEW: "NEW",
  EXISTING: "EXISTING",
};

export const importMethod = {
  MANUAL: "MANUAL",
  CSV: "CSV",
};

export function getQuestionTypeLabel(type: QuestionType) {
  switch (type) {
    case QuestionType.Rating:
      return "Rating";
    case QuestionType.Smiley:
      return "Smiley";
    case QuestionType.LD:
      return "Like or Dislike";
    case QuestionType.YN:
      return "Yes or No";
    case QuestionType.Opinion:
      return "Opinion Scale";
    case QuestionType.Email:
      return "Email";
    case QuestionType.MCQ:
      return "Single Select";
    case QuestionType.MSQ:
      return "Multiple Select";
    case QuestionType.DDSS:
      return "Dropdown Single Select";
    case QuestionType.DDMS:
      return "Dropdown Multi Select";
    case QuestionType.Phone:
      return "Phone";
    case QuestionType.Photo:
      return "Photo";
    case QuestionType.Testimonial:
      return "Testimonial";
    case QuestionType.EmailPhone:
      return "Email & Phone";
    case QuestionType.Text:
      return "Text";
    case QuestionType.TextArea:
      return "Large Text";
    case QuestionType.Number:
      return "Number";
    case QuestionType.DateTime:
      return "DateTime";
    case QuestionType.WaList:
      return "WhatsApp List";
    case QuestionType.WaButtons:
      return "WhatsApp Buttons";
    default:
      throw new Error("Invalid Question Type");
  }
}

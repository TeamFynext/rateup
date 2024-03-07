import {
  QuestionType,
  SentimentClass,
  WaFlowFormElementType,
  WaFlowFormNonInputElementType,
  SubscriptionFeaturePathName as sfpn,
} from "../../types/enums";
import { WaFlowFormElement } from "../../types/global";

export const AuthMode = {
  VERIFY: "VERIFY",
  LOGIN: "LOGIN",
  SIGNUP: "SIGNUP",
  VERIFY_PHONE_NO: "VERIFY_PHONE_NO",
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
  CSV: "CSV IMPORT",
};

export function getQuestionTypeLabel(
  type: QuestionType | WaFlowFormNonInputElementType,
) {
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
    case QuestionType.InfoMessage:
      return "Message";
    case QuestionType.DateTime:
      return "DateTime";
    case QuestionType.CustomNPS:
      return "Custom NPS";
    case QuestionType.PCQ:
      return "Picture Choice";
    case QuestionType.WaList:
      return "WhatsApp List";
    case QuestionType.WaButtons:
      return "WhatsApp Buttons";
    case QuestionType.Contact:
      return "Contact";
    case QuestionType.TnC:
      return "Terms & Conditions";
    case WaFlowFormNonInputElementType.textBody:
      return "Text Body";
    case WaFlowFormNonInputElementType.textCaption:
      return "Text Caption";
    case WaFlowFormNonInputElementType.textHeading:
      return "Text Heading";
    case WaFlowFormNonInputElementType.textSubHeading:
      return "Text Sub Heading";
    case WaFlowFormNonInputElementType.image:
      return "Image";
    default:
      throw new Error("Invalid Question Type");
  }
}

export function getSentimentTypeLabel(sentiment: SentimentClass) {
  switch (sentiment) {
    case SentimentClass.POSITIVE:
      return "Positive";
    case SentimentClass.NEGATIVE:
      return "Negative";
    case SentimentClass.NEUTRAL:
      return "Neutral";
    default:
      throw new Error("Invalid Sentiment Type");
  }
}

export function getSubscriptionFeatureLabel(feature: sfpn) {
  switch (feature) {
    case sfpn.WebSurvey:
      return "Web Survey";
    case sfpn.WhatsAppSurvey:
      return "WhatsApp Survey";
    case sfpn.Menu:
      return "Menu";
    case sfpn.ReputationManagement:
      return "Reputation Management";
    case sfpn.Team:
      return "Team";
    case sfpn.Team + ".teamMember":
      return "Team Members";
    case sfpn.WhatsAppCampaign:
      return "WhatsApp Campaign";
    default:
      throw new Error("Invalid Subscription Feature" + feature);
  }
}

export function getWaFlowFormElementTypeLabel(type: WaFlowFormElementType) {
  switch (type) {
    case WaFlowFormElementType.textInput:
      return "Text Input";
    case WaFlowFormElementType.textArea:
      return "Text Area";
    case WaFlowFormElementType.datePicker:
      return "Date Picker";
    case WaFlowFormElementType.dropDown:
      return "Drop Down";
    case WaFlowFormElementType.radioButtonsGroup:
      return "Radio Buttons Group";
    case WaFlowFormElementType.checkboxGroup:
      return "Checkbox Group";
    case WaFlowFormElementType.textBody:
      return "Text: Body";
    case WaFlowFormElementType.textCaption:
      return "Text: Caption";
    case WaFlowFormElementType.textHeading:
      return "Text: Heading";
    case WaFlowFormElementType.textSubHeading:
      return "Text: Sub Heading";
    case WaFlowFormElementType.image:
      return "Image";
    default:
      throw new Error("Invalid WaFlowFormElementType" + type);
  }
}

import type { ElementType } from "@/types/enums.ts";
import {
  PageType,
  QuestionType,
  SubscriptionFeaturePathName as sfpn,
  WaFlowFormElementType,
  WaFlowFormNonInputElementType,
} from "@/types/enums.ts";

export const AuthMode = {
  VERIFY: "VERIFY",
  LOGIN: "LOGIN",
  SIGNUP: "SIGNUP",
  VERIFY_PHONE_NO: "VERIFY_PHONE_NO",
};

export const ResetSteps = {
  STEP_ONE: "STEP_ONE",
  STEP_TWO: "STEP_TWO",
  STEP_THREE: "STEP_THREE",
};

export const importMethod = {
  MANUAL: "MANUAL",
  CSV: "CSV IMPORT",
};

export function getTypeLabel(type: QuestionType | PageType) {
  if (type in PageType) {
    return getPageTypeLabel(type as PageType);
  } else {
    return getQuestionTypeLabel(type as QuestionType);
  }
}

export function getPageTypeLabel(type: PageType) {
  switch (type) {
    case PageType.Welcome:
      return "Welcome Page";
    case PageType.Custom:
      return "Custom HTML Page";
    case PageType.ThankYou:
      return "Thank You Page";
    case PageType.Language:
      return "Language Page";
    default:
      return false;
  }
}
export function getQuestionTypeLabel(type: ElementType) {
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
      return "Text Input";
    case QuestionType.TextArea:
      return "Large Text";
    case QuestionType.Number:
      return "Number";
    case QuestionType.InfoMessage:
      return "InfoMessage";
    case QuestionType.Date:
      return "Date";
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
    case WaFlowFormNonInputElementType.image:
      return "Image";
    case WaFlowFormNonInputElementType.nonInputText:
      return "Text";
    case WaFlowFormNonInputElementType.embeddedLink:
      return "Embedded Link";
    case WaFlowFormNonInputElementType.optIn:
      return "Opt In";
    case QuestionType.MultiTextInput:
      return "Multi Text Input";
    case QuestionType.MCQGrid:
      return "Single Select Grid";
    case QuestionType.File:
      return "File Input";
    case QuestionType.EmailOtp:
      return "Email OTP";
    case QuestionType.WOP:
      return "Wheel Of Price";
    case QuestionType.WaTimeSlot:
      return "TimeSlot";
    case QuestionType.PhotoPicker:
      return "Photo Picker";
    case QuestionType.DocumentPicker:
      return "Document Picker";
    default:
      return false;
  }
}

const SUBSCRIPTION_FEATURE_LABELS: Readonly<Record<string, string>> = {
  [sfpn.WebSurvey]: "Web Survey",
  [sfpn.Encryption]: "Encryption",
  [sfpn.EmailNotification]: "Email Notification",
  [sfpn.GoogleReview]: "Google Review",
  [sfpn.HTMLCodePage]: "HTML Code Page",
  [sfpn.Team]: "Team",
  [sfpn.TeamMember]: "Team Members",
  [sfpn.Whatsapp]: "Whatsapp",
  [sfpn.AI]: "AI",
  [sfpn.Webhook]: "Webhook",
  [sfpn.WhatsAppConversation]: "WhatsApp Conversation",
  [sfpn.WhatsappCampaign]: "Campaigns",
  [sfpn.WhatsappLoyalty]: "Loyalty",
  [sfpn.WhatsappReferrals]: "Referrals",
  [sfpn.WhatsappCatalog]: "Catalog Sync",
  [sfpn.Menu]: "Digital Menu",
};

/**
 * Whether a feature path is part of the current schema. `Subscription.features`
 * is an untyped Json column, so stored rows can name anything — retired keys
 * (`loyalty`, `whatsapp.flow`) still sit in rows written before the schema
 * migration. Callers use this to mark such a path as unrecognised rather than
 * presenting it as a real, editable feature.
 */
export function isKnownSubscriptionFeature(feature: string): boolean {
  return feature in SUBSCRIPTION_FEATURE_LABELS;
}

/**
 * A display name for a feature path. Never throws: an unknown path is titled
 * from its last segment (`whatsapp.flow` -> "Flow"), because a stale key in one
 * org's stored features must not take the whole admin screen down.
 */
export function getSubscriptionFeatureLabel(feature: sfpn | string): string {
  return (
    SUBSCRIPTION_FEATURE_LABELS[feature] ??
    (feature.split(".").pop() ?? feature)
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/^./, (character) => character.toUpperCase())
  );
}

export function getWaFlowFormElementTypeLabel(type?: WaFlowFormElementType) {
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
    case WaFlowFormElementType.image:
      return "Image";
    case WaFlowFormElementType.embeddedLink:
      return "Embedded Link";
    case WaFlowFormElementType.optIn:
      return "Opt In";
    default:
      throw new Error("Invalid WaFlowFormElementType" + type);
  }
}

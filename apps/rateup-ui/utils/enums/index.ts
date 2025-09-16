import {
  CampaignParticipantStatus,
  LoyaltyCampaignType,
  PageType,
  QuestionType,
  SentimentClass,
  SubscriptionFeaturePathName as sfpn,
  WaFlowFormElementType,
  WaFlowFormNonInputElementType,
} from "../../types/enums";

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
    case sfpn.WebSurvey + ".encryption":
      return "Encryption";
    case sfpn.WebSurvey + ".emailNotification":
      return "Email Notification";
    case sfpn.WebSurvey + ".googleReview":
      return "Google Review";
    case sfpn.WebSurvey + ".htmlCodePage":
      return "HTML Code Page";
    case sfpn.Menu:
      return "Menu";
    case sfpn.Menu + ".monthlyViewLimit":
      return "Menu MonthlyViewLimit";
    case sfpn.ReputationManagement:
      return "Reputation Management";
    case sfpn.Team:
      return "Team";
    case sfpn.Team + ".teamMember":
      return "Team Members";
    case sfpn.Whatsapp:
      return "Whatsapp";
    case sfpn.WhatsAppFlow:
      return "Flow";
    case sfpn.WhatsAppSurvey:
      return "Survey";
    case sfpn.WhatsAppCampaign:
      return "Campaign";
    case sfpn.WhatsAppTemplate:
      return "Template";
    case sfpn.WhatsAppAutomation:
      return "Automation";
    case sfpn.Ticket:
      return "Ticket";
    case sfpn.AI:
      return "AI";
    case sfpn.Loyalty:
      return "Loyalty";
    case sfpn.LoyaltyAction:
      return "Action";
    case sfpn.LoyaltyCustomer:
      return "Customer";
    case sfpn.LoyaltyReward:
      return "Reward";
    case sfpn.WhatsAppAutomationTrigger:
      return "Automation Trigger";
    case sfpn.CarouselTemplate:
      return "Carousel Template";
    case sfpn.Webhook:
      return "Webhook";
    case sfpn.LeadAdAutomation:
      return "Lead Ad Automation";
    default:
      throw new Error("Invalid Subscription Feature" + feature);
  }
}

export function getLoyaltyCampaignTypeLabel(type: LoyaltyCampaignType): string {
  switch (type) {
    case LoyaltyCampaignType.ReferralTransaction:
      return "Referral Transaction";
    default:
      return type;
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

export function getCampaignParticipantStatusLabel(
  status: CampaignParticipantStatus,
) {
  switch (status) {
    case CampaignParticipantStatus.PENDING:
      return "Pending";
    case CampaignParticipantStatus.SENT:
      return "Sent";
    case CampaignParticipantStatus.FAILED:
      return "Failed";
    case CampaignParticipantStatus.COMPLETED:
      return "Completed";
    case CampaignParticipantStatus.DELIVERED:
      return "Delivered";
    case CampaignParticipantStatus.READ:
      return "Read";
    default:
      throw new Error("Invalid CampaignParticipantStatus" + status);
  }
}

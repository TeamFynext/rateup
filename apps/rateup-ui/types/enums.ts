// Any modification to this file should be reflected in the frontend

// to get label use utils/enums -> getQuestionTypeLabel(type: QuestionType)
export enum SurveyType {
  Web = "web",
  WhatsApp = "whatsapp",
  WaFlow = "waFlow",
}
export enum QuestionType {
  Rating = "Rating",
  Smiley = "Smiley",
  LD = "Like or Dislike",
  YN = "Yes or No",
  Opinion = "Opinion Scale",
  Email = "Email",
  MCQ = "Multiple Choice",
  MSQ = "Multiple Select",
  DDSS = "Dropdown SingleSelect",
  DDMS = "Dropdown MultiSelect",
  Phone = "Phone",
  Photo = "Photo",
  Testimonial = "Testimonial",
  EmailPhone = "Email & Phone",
  Text = "Text",
  TextArea = "TextArea",
  Number = "Number",
  DateTime = "DateTime",
  CustomNPS = "Custom NPS",
  PCQ = "Picture Choice",

  // WhatsApp exclusive
  WaList = "Wa_List", // Interactive > List
  WaButtons = "Wa_Buttons", // Interactive > Quick Reply Buttons
}

export enum LDResponse {
  Like = "Like",
  Dislike = "Dislike",
}
export enum YNResponse {
  Yes = "Yes",
  No = "No",
}
// TODO: Use an index value & map to a customizable scale
export enum SmileyResponse {
  VeryHappy = "Very Happy",
  Happy = "Happy",
  Neutral = "Neutral",
  Sad = "Sad",
  VerySad = "Very Sad",
}
export enum LogicAction {
  NextQ = "NextQ",
  EndSurvey = "EndSurvey",
}
export enum LogicCondition {
  Equals = "Equals",
  NotEquals = "NotEquals",
  IncludesNoneOf = "Includes None Of",
  IncludesAnyOf = "Includes Any Of",
  IncludesAllOf = "Includes All Of",
  Submitted = "is Submitted",
}
export enum MenuItemPriceType {
  FIXED = "FIXED",
  VARIANT = "VARIANT",
}
export enum WaTemplateStatus {
  APPROVED = "APPROVED",
  PENDING = "PENDING",
  REJECTED = "REJECTED",
}
export enum WaFlowStatus {
  PUBLISHED = "PUBLISHED",
  DRAFT = "DRAFT",
  DEPRECATED = "DEPRECATED",
  BLOCKED = "BLOCKED",
  THROTTLED = "THROTTLED",
}

export enum SurveyTypeFilters {
  All = "All",
  Web = "Web",
  WhatsApp = "WhatsApp",
}

export enum CampaignStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  COMPLETED = "COMPLETED",
}
export enum CampaignType {
  WHATSAPP = "WHATSAPP",
  EMAIL = "EMAIL",
}
export enum CampaignParticipantSource {
  GROUP = "GROUP",
  INDIVIDUAL = "INDIVIDUAL",
}
export enum CampaignParticipantStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  RESPONDING = "RESPONDING",
  FAILED = "FAILED",
  COMPLETED = "COMPLETED",
}

export enum NPSWeightage {
  PROMOTER = "PROMOTER",
  PASSIVE = "PASSIVE",
  DETRACTOR = "DETRACTOR",
}

export enum SentimentClass {
  POSITIVE = "positive",
  NEGATIVE = "negative",
  NEUTRAL = "neutral",
}
export enum ReviewPlatform {
  GOOGLE = "gb",
  FACEBOOK = "fp",
}
export enum SortType {
  ASC = "asc",
  DESC = "desc",
}
export enum SubscriptionFeaturePathName {
  WebSurvey = "webSurvey",
  WhatsAppSurvey = "whatsappSurvey",
  WhatsAppCampaign = "whatsappCampaign",
  Menu = "menu",
  ReputationManagement = "reputationManagement",
  Team = "team",
  TeamMember = "team.teamMember",
}

export enum PaymentType {
  BASE = "BASE",
  ADDON = "ADDON",
}

export enum PaymentPlanStatus {
  NULL = "NULL",
  LIVE = "LIVE",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}
export enum WaFlowLayoutType {
  scl = "SingleColumnLayout",
}
export enum WaFlowFormElementType {
  textBody = "TextBody",
  textHeading = "TextHeading",
  textSubHeading = "TextSubHeading",
  textCaption = "TextCaption",
  textInput = "TextInput",
  textArea = "TextArea",
  datePicker = "DatePicker",
  footer = "Footer",
  radioButtonsGroup = "RadioButtonsGroup",
  checkboxGroup = "CheckboxGroup",
  dropDown = "Dropdown",
  optIn = "OptIn",
}

// Any modification to this file should be reflected in the frontend
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
  InfoMessage = "InfoMessage",
  Number = "Number",
  Date = "Date",
  CustomNPS = "Custom NPS",
  PCQ = "Picture Choice",
  TnC = "Terms & Conditions",
  Contact = "Contact",
  MultiTextInput = "MultiTextInput",
  MCQGrid = "MCQ Grid",
  File = "File",
  OptIn = "OptIn",
  EmailOtp = "EmailOtp",
  WOP = "Wheel of Price",
  //TODO REMOVE LATER: MYG GIFT VISHU
  WinItem = "Win_item",
  Invoice_Id = "invoice_id",

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
export enum WaButtonType {
  QUICK_REPLY = "quick_reply",
}
export enum WaTemplateComponentType {
  BODY = "body",
  BUTTONS = "buttons",
  HEADER = "header",
  FOOTER = "footer",
}
export enum WaTemplateComponentTypeUpperCase {
  BODY = "BODY",
  BUTTONS = "BUTTONS",
  HEADER = "HEADER",
  FOOTER = "FOOTER",
}
export enum WaTemplateCategory {
  MARKETING = "MARKETING",
  UTILITY = "UTILITY",
  AUTHENTICATION = "AUTHENTICATION",
}
export enum WaTemplateSupportedFormats {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  LOCATION = "LOCATION",
  DOCUMENT = "DOCUMENT",
  VIDEO = "VIDEO",
}
export enum WaTemplateStatus {
  APPROVED = "APPROVED",
  PENDING = "PENDING",
  REJECTED = "REJECTED",
  DRAFT = "DRAFT",
}
export enum WaFlowStatus {
  PUBLISHED = "PUBLISHED",
  DRAFT = "DRAFT",
  DEPRECATED = "DEPRECATED",
  BLOCKED = "BLOCKED",
  THROTTLED = "THROTTLED",
}
// changes.field
export enum WaEvent {
  TemplateStatusChange = "message_template_status_update",
  Message = "messages",
  DELIVERED = "delivered",
  SENT = "sent",
  FAILED = "failed",
  READ = "read",
}

// Changes to these enums should be reflected in schema.prisma defaultValues
export enum CampaignStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SCHEDULED = "SCHEDULED",
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
  READ = "READ",
  DELIVERED = "DELIVERED",
}
export enum CampaignParticipantAddStatus {
  COMPLETED = "COMPLETED",
  NOTCOMPLETED = "NOT COMPLETED",
  PENDING = "PENDING",
  FAILED = "FAILED",
}
export enum SentCampaignEnum {
  NOW = "NOW",
  LATER = "LATER",
}

export enum NPSWeightage {
  PROMOTER = "PROMOTER",
  PASSIVE = "PASSIVE",
  DETRACTOR = "DETRACTOR",
}
export enum ReviewPlatform {
  GOOGLE = "gb",
  FACEBOOK = "fp",
}
export enum SubscriptionFeaturePathName {
  WebSurvey = "webSurvey",
  EmailNotification = "webSurvey.emailNotification",
  GoogleReview = "webSurvey.googleReview",
  Encryption = "webSurvey.encryption",
  Whatsapp = "whatsapp",
  WhatsAppSurvey = "whatsapp.survey",
  WhatsAppCampaign = "whatsapp.campaign",
  WhatsAppFlow = "whatsapp.flow",
  WhatsAppTemplate = "whatsapp.template",
  Menu = "menu",
  ReputationManagement = "reputationManagement",
  Team = "team",
  TeamMember = "team.teamMember",
  Ticket = "ticket",
}
export enum WaFlowLayoutType {
  scl = "SingleColumnLayout",
}
export enum WaFlowFormElementType {
  textBody = "TextBody",
  textHeading = "TextHeading",
  textSubHeading = "TextSubheading",
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

export const ChoiceTypeQuestions = [
  QuestionType.MCQ,
  QuestionType.MSQ,
  QuestionType.DDMS,
  QuestionType.DDSS,
  QuestionType.CustomNPS,
  QuestionType.WaButtons,
];
export enum LoyaltyCampaignType {
  Referral = "Referral",
  ReferralTransaction = "ReferralTransaction",
  Transaction = "Transaction",
}
export enum CampaignRewardType {
  Fixed = "Fixed",
  Percentage = "Percentage",
}
export enum LoyaltyCustomerRewardType {
  Referrer = "Referrer", // the one who referred
  Customer = "Customer", // the one who was referred or made the transaction
}

export enum WaAutomatedReplyMatchType {
  ContainsAnyOf = "ContainsAnyOf",
  ContainsAllOf = "ContainsAllOf",
  Exact = "Exact",
}
export enum WaAutomatedReplyResponseType {
  Text = "Text",
  Template = "Template",
}
export enum WaConfigType {
  Manual = "Manual",
  Automated = "Automated", // through meta login
}

export enum ChatBotDataSourceType {
  WEB = "WEB",
  FILE = "FILE",
  // API = "API"
}

export enum ChatbotPublicPageStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export enum SurveyVariableType {
  DEFAULT = "DEFAULT",
  CUSTOM = "CUSTOM",
}

export enum UserRecipes {
  EmailPassword = "EmailPassword",
  ThirdPartyGoogle = "ThirdPartyGoogle",
  PasswordLess = "PasswordLess",
}

export enum ShopifyEvents {
  ORDERS_CREATE = "ORDERS_CREATE",
  CARTS_CREATE = "CARTS_CREATE",
  CARTS_UPDATE = "CARTS_UPDATE",
  DRAFT_ORDERS_CREATE = "DRAFT_ORDERS_CREATE",
  ORDERS_FULFILLED = "ORDERS_FULFILLED",
  ORDERS_PAID = "ORDERS_PAID",
  ORDERS_CANCELLED = "ORDERS_CANCELLED",
  // FULFILLMENT_ORDERS_CANCELLATION_REQUEST_SUBMITTED
  // FULFILLMENT_ORDERS_CANCELLED
  // ORDERS_PARTIALLY_FULFILLED
  // VARIANTS_IN_STOCK
  // VARIANTS_OUT_OF_STOCK
}

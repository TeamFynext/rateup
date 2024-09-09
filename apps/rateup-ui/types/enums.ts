// Any modification to this file should be reflected in the frontend

// to get label use utils/enums -> getQuestionTypeLabel(type: QuestionType)
export enum SurveyType {
  Web = "web",
  WhatsApp = "whatsapp",
  WaFlow = "waFlow",
}

export enum PageType {
  Welcome = "Welcome",
  Language = "Language",
  ThankYou = "ThankYou",
  Custom = "Custom",
  GoogleReview = "GoogleReview",
}

export enum PageTitle {
  Welcome = "Welcome Page",
  Language = "Language Page",
  ThankYou = "ThankYou Page",
  Custom = "Custom HTML Page",
}

export enum PageDescription {
  Welcome = "This is the first page to welcome",
  Language = "This is the second page for language selection",
  ThankYou = "This is the End Page of the survey",
  Custom = "",
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
  EmailOtp = "EmailOtp",
  WOP = "Wheel of Price",
  //TODO REMOVE LATER: MYG GIFT VISHU
  WinItem = "Win_item",
  Invoice_Id = "invoice_id",

  // WhatsApp exclusive
  Optin = "OptIn",
  WaList = "Wa_List", // Interactive > List
  WaButtons = "Wa_Buttons", // Interactive > Quick Reply Buttons
  WaTimeSlot = "WaTimeSlot",
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
  DRAFT = "DRAFT",
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
  WhatsAppFlow = "WhatsAppFlow",
}

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
  CAMPAIGN = "CAMPAIGN",
}
export enum CampaignParticipantStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  // RESPONDING = "RESPONDING",
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
  EmailNotification = "webSurvey.emailNotification",
  GoogleReview = "webSurvey.googleReview",
  Encryption = "webSurvey.encryption",
  HTMLCodePage = "webSurvey.htmlCodePage",
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
  AI = "ai",
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
  // Non interactive
  nonInputText = "NonText",
  textBody = "TextBody",
  textHeading = "TextHeading",
  textSubHeading = "TextSubheading",
  textCaption = "TextCaption",
  image = "Image",
  embeddedLink = "EmbeddedLink",

  // interactive
  textInput = "TextInput",
  textArea = "TextArea",
  datePicker = "DatePicker",
  footer = "Footer",
  radioButtonsGroup = "RadioButtonsGroup",
  checkboxGroup = "CheckboxGroup",
  dropDown = "Dropdown",
  optIn = "OptIn",
}
export enum WaFlowFormInputElementType {
  textInput = "TextInput",
  textArea = "TextArea",
  datePicker = "DatePicker",
  footer = "Footer",
  radioButtonsGroup = "RadioButtonsGroup",
  checkboxGroup = "CheckboxGroup",
  dropDown = "Dropdown",
  // optIn = "OptIn",
}
export enum WaFlowFormNonInputElementType {
  textBody = "TextBody",
  textHeading = "TextHeading",
  textSubHeading = "TextSubheading",
  textCaption = "TextCaption",
  image = "Image",
  nonInputText = "NonText",
  embeddedLink = "EmbeddedLink",
  optIn = "OptIn",
}

export enum SaveStatus {
  saved = "Saved",
  notSaved = "Pending Save",
  saving = "Saving",
}
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
export enum WhatsappFlowFontWeight {
  bold = "bold",
  italic = "italic",
  boldAndItalic = "bold_italic",
  normal = "normal",
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

export enum WaMessageTypes {
  text = "text",
  image = "image",
  interactive = "interactive",
  button = "button",
}
export enum WaTemplateCategory {
  MARKETING = "MARKETING",
  UTILITY = "UTILITY",
  AUTHENTICATION = "AUTHENTICATION",
}
export enum WaTemplateComponentTypeUpperCase {
  BODY = "BODY",
  BUTTONS = "BUTTONS",
  HEADER = "HEADER",
  FOOTER = "FOOTER",
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

export enum ChatBotSource {
  HUMAN = "HUMAN",
  AI = "AI",
}

export enum ChatbotPublicPageStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export enum StripeProductType {
  one_time = "one_time",
  recurring = "recurring",
}
export enum SurveyVariableType {
  DEFAULT = "DEFAULT",
  CUSTOM = "CUSTOM",
}

export enum ShopifyEvents {
  ORDERS_CREATE = "ORDERS_CREATE",
  ORDERS_FULFILLED = "ORDERS_FULFILLED",
  ORDERS_PAID = "ORDERS_PAID",
  ORDERS_CANCELLED = "ORDERS_CANCELLED",
  DRAFT_ORDERS_CREATE = "DRAFT_ORDERS_CREATE",
  FULFILLMENT_ORDERS_CANCELLED = "FULFILLMENT_ORDERS_CANCELLED",
  ORDERS_PARTIALLY_FULFILLED = "ORDERS_PARTIALLY_FULFILLED",
  // VARIANTS_IN_STOCK
  // VARIANTS_OUT_OF_STOCK
  // FULFILLMENT_ORDERS_CANCELLATION_REQUEST_SUBMITTED
}

export enum ShopifySendAfter {
  TwoHour = "2 Hour",
  FiveHour = "5 Hour",
  TenHour = "10 hour",
  OneDay = "1 day",
  TwoDays = "2 Days",
}

export enum IntegratedApps {
  shopify = "shopify",
  googlesheet = "googlesheet",
  amelia = "amelia",
  waPayment = "waPayment",
}

export enum MenuButtons {
  CONTACT = "contact",
  WHATSAPP = "whatsApp",
  OTHER = "other",
}

export enum TemplateType {
  GENERAL_NOTIFICATION = "GENERAL_NOTIFICATION",
  ORDER_DETAILS = "ORDER_DETAILS",
  PAYMENT_CONFIRMATION = "PAYMENT_CONFIRMATION",
}

export enum OrderType {
  QUICK_PAY = "quick_pay",
}

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

  // WhatsApp exclusive
  Optin = "OptIn",
  WaList = "Wa_List", // Interactive > List
  WaButtons = "Wa_Buttons", // Interactive > Quick Reply Buttons
  WaTimeSlot = "WaTimeSlot",
  DocumentPicker = "Document Picker",
  PhotoPicker = "Photo Picker",
}

export enum QuestionType2 {
  Rating = "Rating",
  Smiley = "Smiley",
  LD = "Like or Dislike",
  YN = "Yes or No",
  Opinion = "Opinion Scale",
  TextHeading = "Text Heading",
  TextSubheading = "Text Subheading",
  TextBody = "Text Body",
  TextCaption = "Text Caption",
  TextInput = "Text Input",
  TextArea = "Text Area",
  CheckboxGroup = "Multiple Select",
  RadioButtonsGroup = "Single Select",
  Footer = "Footer",
  Dropdown = "Dropdown Single Select",
  OptIn = "Opt In",
  DatePicker = "DatePicker",
  Image = "Image",
  DocumentPicker = "Document Picker",
  PhotoPicker = "Photo Picker",
  RichText = "RichText",
  EmbeddedLink = "Embedded Link",
  ChipsSelector = "Chips Selector",
  ImageCarousel = "Image Carousel",
  // If = "If",
  // Switch = "Switch",
}
export enum WaQuestions {
  Rating = "Rating",
  Smiley = "Smiley",
  LD = "LD",
  YN = "YN",
  Opinion = "Opinion",
  TextHeading = "TextHeading",
  TextSubheading = "TextSubheading",
  TextBody = "TextBody",
  TextCaption = "TextCaption",
  TextInput = "TextInput",
  TextArea = "TextArea",
  CheckboxGroup = "CheckboxGroup",
  RadioButtonsGroup = "RadioButtonsGroup",
  Footer = "Footer",
  Dropdown = "Dropdown",
  OptIn = "OptIn",
  DatePicker = "DatePicker",
  Image = "Image",
  DocumentPicker = "DocumentPicker",
  PhotoPicker = "PhotoPicker",
  RichText = "RichText",
  EmbeddedLink = "EmbeddedLink",
  ChipsSelector = "ChipsSelector",
  ImageCarousel = "ImageCarousel",
  // If = "If",
  // Switch = "Switch",
}

export enum LDResponse {
  Like = "Like",
  Dislike = "Dislike",
}
export enum LDResponse2 {
  Like = "👍",
  Dislike = "👎",
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
export enum SmileyResponse2 {
  VerySad = "😡",
  Sad = "😕",
  Neutral = "😐",
  Happy = "😊",
  VeryHappy = "😃",
}
export enum RatingScale {
  VeryPoor = "⭐️",
  Poor = "⭐️⭐️",
  Average = "⭐️⭐️⭐️",
  Good = "⭐️⭐️⭐️⭐️",
  Excellent = "⭐️⭐️⭐️⭐️⭐️",
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
export enum LogicConditionComponentLevel {
  EqualsTo = "==",
  NotEquals = "!=",
  And = "&&",
  Or = "||",
  Not = "!",
  LessThan = "<",
  GreaterThan = ">",
  LessThanOrEqual = "<=",
  GreaterThanOrEqual = ">=",
  Parentheses = "()",
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

export enum CampaignStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  QUEUING = "QUEUING",
  DEQUEUING = "DEQUEUING",
  DRAFT = "DRAFT",
  FAILED = "FAILED",
}
export enum CampaignType {
  WHATSAPP = "WHATSAPP",
  EMAIL = "EMAIL",
  DRIP = "DRIP",
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

export enum SubscriptionFeaturePathName {
  WebSurvey = "webSurvey",
  EmailNotification = "webSurvey.emailNotification",
  GoogleReview = "webSurvey.googleReview",
  Encryption = "webSurvey.encryption",
  HTMLCodePage = "webSurvey.htmlCodePage",
  Whatsapp = "whatsapp",
  WhatsAppConversation = "whatsapp.conversation",
  // Tier gates, split out of `whatsapp.active` so the inbox can stay on for every
  // tier while these are Starter-and-above. Mirrors rateup-api/src/types/enums.ts.
  WhatsappCampaign = "whatsapp.campaign",
  WhatsappLoyalty = "whatsapp.loyalty",
  WhatsappReferrals = "whatsapp.referrals",
  WhatsappCatalog = "whatsapp.catalog",
  Menu = "menu",
  Team = "team",
  TeamMember = "team.teamMember",
  AI = "ai",
  Webhook = "webSurvey.webhook",
}

export enum TeamFeature {
  Inbox = "inbox",
  Analytics = "analytics",
  Contacts = "contacts",
  Campaigns = "campaigns",
  Flows = "flows",
  Chatbots = "chatbots",
  Templates = "templates",
  Automation = "automation",
  Loyalty = "loyalty",
  WebForms = "web_forms",
  Tickets = "tickets",
  Pipeline = "pipeline",
  QrStudio = "qr_studio",
  AiChatbot = "ai_chatbot",
  AppsServices = "apps_services",
  Settings = "settings",
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
  imageCarousel = "ImageCarousel",
  // interactive
  textInput = "TextInput",
  textArea = "TextArea",
  datePicker = "DatePicker",
  footer = "Footer",
  radioButtonsGroup = "RadioButtonsGroup",
  checkboxGroup = "CheckboxGroup",
  dropDown = "Dropdown",
  optIn = "OptIn",
  photoPicker = "PhotoPicker",
  documentPicker = "DocumentPicker",
  if = "If",
  chipsSelector = "ChipsSelector",
}
export enum WaFlowFormInputElementType {
  textInput = "TextInput",
  textArea = "TextArea",
  datePicker = "DatePicker",
  footer = "Footer",
  radioButtonsGroup = "RadioButtonsGroup",
  checkboxGroup = "CheckboxGroup",
  dropDown = "Dropdown",
  photoPicker = "PhotoPicker",
  documentPicker = "DocumentPicker",

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
  if = "If",
}

/** Every kind of element the survey/flow editors can list in their "add element" catalogue. */
export type ElementType =
  | QuestionType
  | PageType
  | WaFlowFormElementType
  | WaFlowFormNonInputElementType;

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
  order = "order",
}
export enum WaTemplateCategory {
  MARKETING = "MARKETING",
  UTILITY = "UTILITY",
  AUTHENTICATION = "AUTHENTICATION",
}
/**
 * Component names in an outgoing template payload. Meta accepts these lowercase, unlike the
 * uppercase names it uses when returning a template's definition.
 */
/** The parameter kinds a template component accepts. */
export enum WaTemplateSupportedParameters {
  IMAGE = "image",
  TEXT = "text",
  DOCUMENT = "document",
  VIDEO = "video",
  LOCATION = "location",
  PAYLOAD = "payload",
  CURRENCY = "currency",
  DATE_TIME = "date_time",
}

export enum WaTemplateComponentType {
  header = "header",
  body = "body",
  button = "button",
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
  Chatbot = "Chatbot",
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
  ABANDONED_CHECKOUTS = "ABANDONED_CHECKOUTS",
  // VARIANTS_IN_STOCK
  // VARIANTS_OUT_OF_STOCK
  // FULFILLMENT_ORDERS_CANCELLATION_REQUEST_SUBMITTED
}

export enum IntegratedApps {
  shopify = "shopify",
  googlesheet = "googlesheet",
  amelia = "amelia",
  waPayment = "waPayment",
  petpooja = "petpooja",
  zapier = "zapier",
  zoho = "zoho",
  getlead = "getlead",
}
export enum PhotoSource {
  cameraGallery = "camera_gallery",
  gallery = "gallery",
  camera = "camera",
}
export enum InputType {
  Text = "text",
  Number = "number",
  Email = "email",
  Password = "password",
  Passcode = "passcode",
  Phone = "phone",
}

export enum DocumentMimeType {
  Gzip = "application/gzip",
  Msword = "application/msword",
  Pdf = "application/pdf",
  VndMsExcel = "application/vnd.ms-excel",
  VndMsPowerpoint = "application/vnd.ms-powerpoint",
  VndOasisOpendocumentPresentation = "application/vnd.oasis.opendocument.presentation",
  VndOasisOpendocumentSpreadsheet = "application/vnd.oasis.opendocument.spreadsheet",
  VndOasisOpendocumentText = "application/vnd.oasis.opendocument.text",
  VndOpenxmlformatsOfficedocumentPresentationmlPresentation = "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  VndOpenxmlformatsOfficedocumentSpreadsheetmlSheet = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  VndOpenxmlformatsOfficedocumentWordprocessingmlDocument = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  X7zCompressed = "application/x-7z-compressed",
  Zip = "application/zip",
  Avif = "image/avif",
  Gif = "image/gif",
  Heic = "image/heic",
  Heif = "image/heif",
  Jpeg = "image/jpeg",
  Png = "image/png",
  Tiff = "image/tiff",
  Webp = "image/webp",
  Plain = "text/plain",
  Mp4 = "video/mp4",
  Mpeg = "video/mpeg",
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
  LOYALTY = "LOYALTY",
  CAROUSEL = "CAROUSEL",
}

export enum OrderType {
  QUICK_PAY = "quick_pay",
}

export enum LoyaltyActionType {
  ReferralPurchase = "Referral Purchase",
  DirectPurchase = "Direct Purchase",
  CustomerRegistration = "Customer Registration",
  FeedBack = "FeedBack",
}

export enum ContactGroupType {
  NORMAL = "NORMAL",
  LOYALTY = "LOYALTY",
}

export enum WaMessageAssignStatus {
  NEW = "NEW",
  ASSIGNED = "ASSIGNED",
  CLOSED = "CLOSED",
  UNASSIGNED = "UNASSIGNED",
  /**
   * No longer a ticket status — spam moved onto the contact (`isSpam`) and a spam
   * ticket is stored as CLOSED. Kept because the thread still labels the *event*
   * with it, and rows written before the migration still carry it.
   */
  SPAM = "SPAM",
  RESOLVED = "RESOLVED",
  UNRESOLVED = "UNRESOLVED",
}

/**
 * The thread event for "this contact is not spam any more". Its counterpart is
 * `WaMessageAssignStatus.SPAM`; neither is a stored ticket status.
 */
export const NOT_SPAM_EVENT = "NOT_SPAM";

export enum WaMessageAssignStatusTab {
  NEW = "New",
  UNASSIGNED = "UnAssigned",
  ASSIGNED = "Assigned",
  ASSIGNEDTOME = "Assigned To Me",
  CLOSED = "Closed",
  RESOLVED = "Resolved",
  UNRESOLVED = "Unresolved",
  SPAM = "Spam",
}

export enum CatalogProductType {
  PRODUCT_ITEM = "PRODUCT_ITEM",
  HOTEL = "HOTEL",
  HOTEL_ROOM = "HOTEL_ROOM",
}

export enum WaAssignedChatPermission {
  All = "All",
  TeamMembers = "TeamMembers",
  Admins = "Admins",
}

export enum MessagePlatform {
  INSTAGRAM = "INSTAGRAM",
  WHATSAPP = "WHATSAPP",
  WEBCHAT = "WEBCHAT",
  FACEBOOK = "FACEBOOK",
}

export enum MetaLoginAssets {
  WHATSAPP = "WHATSAPP ACCOUNTS",
  PAGES = "FACEBOOK PAGES",
  CATALOGS = "CATALOGS",
  INSTAGRAM = "INSTAGRAM ACCOUNTS",
  ADACCOUNTS = "AD ACCOUNTS",
}

export enum ZapierTriggers {
  CONTACT_CREATE = "new_contact_create",
  CONTACT_ASSIGN = "new_contact_assignee",
  NEW_MESSAGE = "new_message_received",
  CONVERSATION_CLOSED = "conversation_closed",
  CONTACT_UPDATED = "contact_updated",
  CONTACT_LIFECYCLE_UPDATED = "contact_lifecycle_updated",
  /** The board's counterpart to the lifecycle trigger, added beside it. */
  CONTACT_STAGE_UPDATED = "contact_stage_updated",
  RESPONSE_SUBMITTED = "response_submitted",
  CONTACT_DELETED = "contact_deleted",
  NEW_TEAM_MEMBER_CREATED = "new_staff_joined_to_team",
  CONTACT_ADDED_TO_GROUP = "contact_added_to_group",
}
export enum SendMode {
  NOW = "NOW",
  SCHEDULED = "SCHEDULED",
}

export enum SentCampaignChoice {
  NOW = "NOW",
  LATER = "LATER",
}

export enum WhatsappSettingsStatus {
  ACTIVE = "ACTIVE",
  DISCONNECTED = "DISCONNECTED",
}

export enum LoyaltyPointRewardSubType {
  DISCOUNT_FIXED = "discount_fixed",
  DISCOUNT_PERCENTAGE = "discount_percentage",
  FREE_ITEM = "free_item",
}

export enum LoyaltyRewardStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  EXPIRED = "EXPIRED",
  OUT_OF_STOCK = "OUT_OF_STOCK",
}

export const EXCLUDED_KEYS = new Set([
  "retailerId",
  "currency",
  "price",
  "quantity",
  "title",
  "image",
  "image_link",
  "name",
  "description",
  "availability",
  "condition",
  "visibility",
  "url",
]);

export const STAGE_LABELS: Record<string, string> = {
  PENDING_ADDRESS: "Awaiting Address",
  PENDING_DELIVERY: "Awaiting Delivery",
  PENDING_PAYMENT: "Awaiting Payment",
  PENDING_CHECKOUT: "Checkout Sent",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const COMMON_CARRIERS = [
  "Delhivery",
  "DHL Express",
  "Blue Dart",
  "DTDC",
  "Ekart",
  "Xpressbees",
  "Shadowfax",
  "India Post",
  "FedEx",
  "UPS",
  "USPS",
  "4PX",
  "Amazon Logistics",
  "Canada Post",
  "Royal Mail",
  "Australia Post",
  "Japan Post",
  "GLS",
  "Hermes",
];

/** Smiley-question appearance. Persisted in a question's `features.iconStyle`. */
export enum SmileyVariantStyle {
  Default = "Default",
  Filled = "Filled",
  FilledOnHover = "FilledOnHover",
  Emojis = "Emojis",
  Custom = "Custom",
}

export enum SmileyColorType {
  Default = "Default",
  Individual = "Individual",
  Gradient = "Gradient",
}

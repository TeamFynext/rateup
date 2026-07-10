// Any modification to this file should be reflected in the frontend
export enum SurveyType {
  Web = "web",
  WhatsApp = "whatsapp",
  WaFlow = "waFlow",
}

export enum PageType {
  Welcome = "Welcome",
  ThankYou = "ThankYou",
  Custom = "Custom",
  Language = "Language",
  GoogleReview = "GoogleReview",
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
  // WhatsApp exclusive
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

export enum RatingScale {
  VeryPoor = "VeryPoor",
  Poor = "Poor",
  Average = "Average",
  Good = "Good",
  Excellent = "Excellent",
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
  CAROUSEL = "carousel",
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
  PRODUCT = "PRODUCT",
}
export enum WaTemplateStatus {
  APPROVED = "APPROVED",
  PENDING = "PENDING",
  REJECTED = "REJECTED",
  DRAFT = "DRAFT",
  PENDING_DELETION = "PENDING_DELETION",
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
  TemplateCategoryUpdate = "template_category_update",
  Message = "messages",
  DELIVERED = "delivered",
  SENT = "sent",
  FAILED = "failed",
  READ = "read",
  LEADGEN = "leadgen",
  SMBMessageEchoes = "smb_message_echoes",
  ACCOUNT_UPDATE = "account_update",
}

export enum WhatsappSettingsStatus {
  ACTIVE = "ACTIVE",
  DISCONNECTED = "DISCONNECTED",
}

// Changes to these enums should be reflected in schema.prisma defaultValues
export enum CampaignStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  QUEUING = "QUEUING",
  DEQUEUING = "DEQUEUING",
}
export enum CampaignType {
  WHATSAPP = "WHATSAPP",
  EMAIL = "EMAIL",
  DRIP = "DRIP",
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
  WhatsAppAutomation = "whatsapp.automation",

  ReputationManagement = "reputationManagement",
  Team = "team",
  TeamMember = "team.teamMember",
  Ticket = "ticket",
  AI = "ai",
  Loyalty = "loyalty",
  LoyaltyCustomer = "loyalty.customer",
  LoyaltyAction = "loyalty.action",
  LoyaltyReward = "loyalty.reward",
  WhatsAppAutomationTrigger = "whatsapp.automation.automationTrigger",
  LeadAdAutomation = "whatsapp.automation.leadAd",
  Webhook = "webSurvey.webhook",
  CarouselTemplate = "whatsapp.template.carouselTemplate",
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
  photoPicker = "PhotoPicker",
  documentPicker = "DocumentPicker",
  if = "If",
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
  ThirdPartyApple = "ThirdPartyApple",
  PasswordLess = "PasswordLess",
}

export enum ShopifyEvents {
  ORDERS_CREATE = "ORDERS_CREATE",
  DRAFT_ORDERS_CREATE = "DRAFT_ORDERS_CREATE",
  ORDERS_FULFILLED = "ORDERS_FULFILLED",
  ORDERS_PAID = "ORDERS_PAID",
  ORDERS_CANCELLED = "ORDERS_CANCELLED",
  ORDERS_EDITED = "ORDERS_EDITED",
  FULFILLMENT_ORDERS_CANCELLED = "FULFILLMENT_ORDERS_CANCELLED",
  ORDERS_PARTIALLY_FULFILLED = "ORDERS_PARTIALLY_FULFILLED",
  APP_UNINSTALLED = "APP_UNINSTALLED",
  APP_SUBSCRIPTIONS_UPDATE = "APP_SUBSCRIPTIONS_UPDATE",
  ABANDONED_CHECKOUTS = "ABANDONED_CHECKOUTS",
  // VARIANTS_IN_STOCK
  // VARIANTS_OUT_OF_STOCK
  // FULFILLMENT_ORDERS_CANCELLATION_REQUEST_SUBMITTED
}

export enum ShopifySendAfter {
  OneHour = "1 Hour",
  TwoHour = "2 Hour",
  FiveHour = "5 Hour",
  TenHour = "10 hour",
  OneDay = "1 day",
  TwoDays = "2 Days",
}

export enum ResponseSummaryType {
  All = "all",
  Team = "team",
}

export enum IntegratedApps {
  shopify = "shopify",
  googlesheet = "googlesheet",
  amelia = "amelia",
  waPayment = "waPayment",
  petpooja = "petpooja",
  zapier = "zapier",
  zoho = "zoho",
}

export enum PhotoSource {
  cameraGallery = "camera_gallery",
  gallery = "gallery",
  camera = "camera",
}

export enum WaMessageScheduleStatus {
  SCHEDULED = "SCHEDULED",
  SENT = "SENT",
  FAILED = "FAILED",
  READ = "READ",
  DELIVERED = "DELIVERED",
}

export enum waMessageScheduleSource {
  ExternalApi = "ExternalApi",
}

export enum LoyaltyTemplateTypes {
  CustomerRegistration = "CustomerRegistration",
  PointInformation = "PointInformation",
  Referral = "Referral",
  CustomerRemoval = "CustomerRemoval",
  RewardsIssued = "RewardsIssued",
  PointsIssued = "PointsIssued",
  PointsAdjusted = "PointsAdjusted",
  RewardIssued = "RewardIssued",
  RewardRedeemed = "RewardRedeemed",
  TierUpgraded = "TierUpgraded",
}

export enum WaMessageAssignStatus {
  UNASSIGNED = "UNASSIGNED",
  ASSIGNED = "ASSIGNED",
  CLOSED = "CLOSED",
  SPAM = "SPAM",
  RESOLVED = "RESOLVED",
  UNRESOLVED = "UNRESOLVED",
}

export enum LoyaltyApiFeature {
  action = "action",
  reward = "reward",
}

export enum LoyaltyEventType {
  POINTS_ISSUED = "POINTS_ISSUED",
  POINTS_ADJUSTED = "POINTS_ADJUSTED",
  REWARD_ISSUED = "REWARD_ISSUED",
  REWARD_REDEEMED = "REWARD_REDEEMED",
  TIER_UPGRADED = "TIER_UPGRADED",
  BIRTHDAY = "BIRTHDAY",
  INACTIVITY_REMINDER = "INACTIVITY_REMINDER",
  POINTS_EXPIRY_ALERT = "POINTS_EXPIRY_ALERT",
  POINTS_EXPIRED = "POINTS_EXPIRED",
}

export enum AssignType {
  me = "me",
  staff = "staff",
}

export enum WaAssignedChatPermission {
  All = "All",
  TeamMembers = "TeamMembers",
  Admins = "Admins",
}

export enum InstagramEvent {
  MESSAGE = "MESSAGE",
  MESSAGE_REACTION = "MESSAGE_REACTION",
  MESSAGE_SEEN = "MESSAGE_SEEN",
  POSTBACK = "POSTBACK",
  REFERRAL = "REFERRAL",
  STORY_MENTION = "STORY_MENTION",
  COMMENT = "COMMENT",
  LIVE_COMMENT = "LIVE_COMMENT",
}

export enum FacebookEvent {
  MESSAGE = "MESSAGE",
  MESSAGE_DELIVERED = "MESSAGE_DELIVERED",
  MESSAGE_READ = "MESSAGE_READ",
  POSTBACK = "POSTBACK",
  QUICK_REPLY = "QUICK_REPLY",
  OPT_IN = "OPT_IN",
}

export enum SupportUserEvent {
  MESSAGE = "MESSAGE",
}

export enum MetaLoginAssets {
  WHATSAPP = "WHATSAPP ACCOUNTS",
  PAGES = "FACEBOOK PAGES",
  CATALOGS = "CATALOGS",
  INSTAGRAM = "INSTAGRAM ACCOUNTS",
  ADACCOUNTS = "AD ACCOUNTS",
}

export enum CatalogStoreType {
  STANDARD = "standard",
  SHOPIFY = "shopify",
}

export enum CatalogPaymentMethod {
  SHOPIFY_CHECKOUT = "shopify_checkout",
  SHOPIFY_NATIVE = "shopify_native",
  UPI = "upi",
  COD = "cod",
  BANK = "bank",
  NATIVE = "native",
  MANUAL = "manual",
}

export enum CatalogAddressFlowStatus {
  APPROVED = "approved",
  REJECTED = "rejected",
  IDLE = "idle",
  REVIEW = "review",
  SUBMITTING = "submitting",
}

export enum CatalogOrderStage {
  PENDING_ADDRESS = "PENDING_ADDRESS",
  PENDING_DELIVERY = "PENDING_DELIVERY",
  PENDING_PAYMENT = "PENDING_PAYMENT",
  PENDING_CHECKOUT = "PENDING_CHECKOUT",
  COMPLETED = "COMPLETED",
}

import {
  PageType,
  QuestionType,
  QuestionType2,
  ShopifyEvents,
  WaMessageAssignStatus,
  WaFlowFormElementType as wft,
} from "@/types/enums.ts";

import MMImageCropModalStyles from "@/components/Modal/ModalManagerModals/ImageCropModal/ImageCropModal.module.css";

export const docsPath = "https://docs.rateup.app";
export const imagesPath = `${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images`;

export const surveyUploadsPath = `${import.meta.env.VITE_AWS_CLOUDFRONT_URL}`;
export const isProduction = import.meta.env.VITE_FRONTEND_URL === "https://rateup.app";
export const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const ContactQuestions = [QuestionType.Contact];

const WaContactQuestions = [QuestionType.Email, QuestionType.Phone];

export const NPSQuestions = [
  QuestionType.Rating,
  QuestionType.Smiley,
  QuestionType.LD,
  QuestionType.YN,
  QuestionType.Opinion,
  QuestionType.CustomNPS,
];

export const WaNPSQuestions = [
  QuestionType.Rating,
  QuestionType.Smiley,
  QuestionType.LD,
  QuestionType.YN,
  QuestionType.Opinion,
  QuestionType.CustomNPS,
];
export const WaNPSQuestions2 = [
  QuestionType2.Rating,
  QuestionType2.Smiley,
  QuestionType2.LD,
  QuestionType2.YN,
  QuestionType2.Opinion,
];
const FlowNpsQ = [
  QuestionType.Rating,
  QuestionType.Smiley,
  QuestionType.LD,
  QuestionType.YN,
  QuestionType.Opinion,
];
const FlowNpsQ2 = [
  QuestionType2.Rating,
  QuestionType2.Smiley,
  QuestionType2.LD,
  QuestionType2.YN,
  QuestionType2.Opinion,
];
const ChoiceQuestions = [
  QuestionType.MCQ,
  QuestionType.MSQ,
  QuestionType.DDSS,
  QuestionType.DDMS,
  QuestionType.PCQ,
  QuestionType.MCQGrid,
];

const InputQuestions = [
  QuestionType.Text,
  QuestionType.TextArea,
  QuestionType.Number,
  QuestionType.Date,
  QuestionType.Photo,
  QuestionType.MultiTextInput,
  QuestionType.File,
];

const OtherQuestions = [
  QuestionType.Testimonial,
  QuestionType.TnC,
  QuestionType.InfoMessage,
  QuestionType.EmailOtp,
  QuestionType.WOP,
];

const WaOtherQuestions = [
  QuestionType.Text,
  QuestionType.Number,
  QuestionType.MCQ,
  QuestionType.Date,
  QuestionType.Photo,
  QuestionType.Testimonial,
];

export const FlowChoiceQuestions = [QuestionType.MCQ, QuestionType.MSQ, QuestionType.DDSS];

const FlowChoiceQuestions2 = [
  QuestionType2.RadioButtonsGroup,
  QuestionType2.CheckboxGroup,
  QuestionType2.Dropdown,
  QuestionType2.ChipsSelector,
];
const FlowInputQuestions = [
  QuestionType.Text,
  QuestionType.TextArea,
  QuestionType.Date,
  QuestionType.Optin,
  QuestionType.WaTimeSlot,
  QuestionType.PhotoPicker,
  QuestionType.DocumentPicker,
];
const FlowInputQuestions2 = [
  QuestionType2.TextInput,
  QuestionType2.TextArea,
  QuestionType2.DatePicker,
  QuestionType2.OptIn,
  // QuestionType2.WaTimeSlot,
  QuestionType2.PhotoPicker,
  QuestionType2.DocumentPicker,
];
export const BasicPages = [
  PageType.Welcome,
  PageType.ThankYou,
  PageType.Custom,
  // PageType.Language,
];

export const uniquePages = [PageType.Welcome, PageType.Language, PageType.ThankYou];

const WaExclusive = [QuestionType.WaList, QuestionType.WaButtons];

export const QuestionTypesGroup = [
  { title: "Contact Questions", questionTypes: ContactQuestions },
  { title: "NPS Questions", questionTypes: NPSQuestions },
  { title: "Choice Questions", questionTypes: ChoiceQuestions },
  { title: "Input Questions", questionTypes: InputQuestions },
  { title: "Other Questions", questionTypes: OtherQuestions },
];

export const WaSurveyQuestionTypes = [
  { title: "Contact Questions", questionTypes: WaContactQuestions },
  { title: "NPS Questions", questionTypes: WaNPSQuestions },
  { title: "Other Questions", questionTypes: WaOtherQuestions },
  { title: "WhatsApp Exclusive Questions", questionTypes: WaExclusive },
];
const flowNonInputElements = [
  wft.nonInputText,
  wft.image,
  // not currectly working
  // wft.embeddedLink,
];
const flowNonInputElements2 = [
  QuestionType2.TextHeading,
  QuestionType2.TextSubheading,
  QuestionType2.TextBody,
  QuestionType2.TextCaption,
  // QuestionType2.RichText,
  QuestionType2.Image,
  QuestionType2.EmbeddedLink,
  QuestionType2.ImageCarousel,
];
export const FlowQuestionTypes = [
  // also includes non-input elements like text & links
  { title: "Contact Questions", questionTypes: WaContactQuestions },
  { title: "NPS Questions", questionTypes: FlowNpsQ },
  { title: "Choice Questions", questionTypes: FlowChoiceQuestions },
  { title: "Input Questions", questionTypes: FlowInputQuestions },
  { title: "Non-Input Elements", questionTypes: flowNonInputElements },
];

export const FlowQuestionTypes2 = [
  // also includes non-input elements like text & links
  { title: "NPS Questions", questionTypes: FlowNpsQ2 },
  { title: "Choice Questions", questionTypes: FlowChoiceQuestions2 },
  { title: "Input Questions", questionTypes: FlowInputQuestions2 },
  { title: "Non-Input Elements", questionTypes: flowNonInputElements2 },
];
export const ChoiceTypeQuestions = [
  QuestionType.MCQ,
  QuestionType.MSQ,
  QuestionType.DDMS,
  QuestionType.DDSS,
  QuestionType.CustomNPS,
  QuestionType.WaButtons,
];

export const fallbackImage = `${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/no_image_template.jpeg`;

export const mimeTypesForImage: { [key: string]: string } = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "application/svg+xml",
};

export const MAX_FILE_SIZE_IN_MB = 10;
export const MAX_FILE_SIZE_IN_BYTE = MAX_FILE_SIZE_IN_MB * 1024 * 1024;

export const PAGE_SIZE = ["50", "100", "200", "500"];

export const SAVE_HOTKEY = "mod+s";

export const COORDINATESX = ["LEFT", "CENTER", "RIGHT"];
export const COORDINATESY = ["TOP", "MIDDLE", "BOTTOM", "DEFAULT"];

export const WHATSAPP_TEMPLATE_CATEGORY = ["MARKETING", "UTILITY", "AUTHENTICATION"];
export enum WHATSAPP_TEMPLATE_BROADCAST_TYPE {
  NONE = "NONE",
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  DOCUMENT = "DOCUMENT",
  LOCATION = "LOCATION",
  PRODUCT = "PRODUCT",
}

export enum WHATSAPP_BUTTON_TYPE {
  QUICK_REPLY = "QUICK_REPLY",
  COPY_OFFER_CODE = "COPY_CODE",
  CALL_PHONE_NUMBER = "PHONE_NUMBER",
  VISIT_WEBSITE = "URL",
  FLOW = "FLOW",
  WEBSURVEY = "WEBSURVEY",
  ORDER_DETAILS = "ORDER_DETAILS",
  CATALOG = "CATALOG",
  MPM = "MPM",
  SPM = "SPM",
  OTP = "OTP",
}

export const WHATSAPP_TEMPLATE_LANGUAGE = [
  { label: "Afrikaans", value: "af" },
  { label: "Albanian", value: "sq" },
  { label: "Arabic", value: "ar" },
  { label: "Azerbaijani", value: "az" },
  { label: "Bengali", value: "bn" },
  { label: "Bulgarian", value: "bg" },
  { label: "Catalan", value: "ca" },
  { label: "Chinese (CHN)", value: "zh_CN" },
  { label: "Chinese (HKG)", value: "zh_HK" },
  { label: "Chinese (TAI)", value: "zh_TW" },
  { label: "Croatian", value: "hr" },
  { label: "Czech", value: "cs" },
  { label: "Danish", value: "da" },
  { label: "Dutch", value: "nl" },
  { label: "English", value: "en" },
  { label: "English (UK)", value: "en_GB" },
  { label: "English (US)", value: "en_US" },
  { label: "Estonian", value: "et" },
  { label: "Filipino", value: "fil" },
  { label: "Finnish", value: "fi" },
  { label: "French", value: "fr" },
  { label: "Georgian", value: "ka" },
  { label: "German", value: "de" },
  { label: "Greek", value: "el" },
  { label: "Gujarati", value: "gu" },
  { label: "Hausa", value: "ha" },
  { label: "Hebrew", value: "he" },
  { label: "Hindi", value: "hi" },
  { label: "Hungarian", value: "hu" },
  { label: "Indonesian", value: "id" },
  { label: "Irish", value: "ga" },
  { label: "Italian", value: "it" },
  { label: "Japanese", value: "ja" },
  { label: "Kannada", value: "kn" },
  { label: "Kazakh", value: "kk" },
  { label: "Kinyarwanda", value: "rw_RW" },
  { label: "Korean", value: "ko" },
  { label: "Kyrgyz (Kyrgyzstan)", value: "ky_KG" },
  { label: "Lao", value: "lo" },
  { label: "Latvian", value: "lv" },
  { label: "Lithuanian", value: "lt" },
  { label: "Macedonian", value: "mk" },
  { label: "Malay", value: "ms" },
  { label: "Malayalam", value: "ml" },
  { label: "Marathi", value: "mr" },
  { label: "Norwegian", value: "nb" },
  { label: "Persian", value: "fa" },
  { label: "Polish", value: "pl" },
  { label: "Portuguese (BR)", value: "pt_BR" },
  { label: "Portuguese (POR)", value: "pt_PT" },
  { label: "Punjabi", value: "pa" },
  { label: "Romanian", value: "ro" },
  { label: "Russian", value: "ru" },
  { label: "Serbian", value: "sr" },
  { label: "Slovak", value: "sk" },
  { label: "Slovenian", value: "sl" },
  { label: "Spanish", value: "es" },
  { label: "Spanish (ARG)", value: "es_AR" },
  { label: "Spanish (SPA)", value: "es_ES" },
  { label: "Spanish (MEX)", value: "es_MX" },
  { label: "Swahili", value: "sw" },
  { label: "Swedish", value: "sv" },
  { label: "Tamil", value: "ta" },
  { label: "Telugu", value: "te" },
  { label: "Thai", value: "th" },
  { label: "Turkish", value: "tr" },
  { label: "Ukrainian", value: "uk" },
  { label: "Urdu", value: "ur" },
  { label: "Uzbek", value: "uz" },
  { label: "Vietnamese", value: "vi" },
  { label: "Zulu", value: "zu" },
];

export const mmImageCropModalClassnames = {
  content: MMImageCropModalStyles["modal-content"],
  header: MMImageCropModalStyles["modal-header"],
  body: MMImageCropModalStyles["modal-body"],
};

export const shopifyEventData = [
  { label: "On Orders create", value: ShopifyEvents.ORDERS_CREATE },
  { label: "On Orders fulfilled", value: ShopifyEvents.ORDERS_FULFILLED },
  { label: "On Orders paid", value: ShopifyEvents.ORDERS_PAID },
  { label: "On Orders cancelled", value: ShopifyEvents.ORDERS_CANCELLED },
  {
    label: "On Draft Orders created",
    value: ShopifyEvents.DRAFT_ORDERS_CREATE,
  },
  {
    label: "On orders partially fulfilled",
    value: ShopifyEvents.ORDERS_PARTIALLY_FULFILLED,
  },
  {
    label: "On fulfilled orders cancelled",
    value: ShopifyEvents.FULFILLMENT_ORDERS_CANCELLED,
  },
  {
    label: "On abandoned checkouts",
    value: ShopifyEvents.ABANDONED_CHECKOUTS,
  },
];

export const defaultTitleSubtitleStartBtnTextsObj = {
  welcomePage: {
    titleText: `<h3 style="text-align: center">Welcome</h3><p style="text-align: center">Welcome to the survey</p>`,
    startButtonText: "Start Survey",
  },
  languagePage: {
    titleText: `<h3 style="text-align: center">Select a Language</h3>`,
    startButtonText: "Start Survey",
  },
  thankyouPage: {
    titleText: `<h3 style="text-align: center">Thank you</h3><p style="text-align: center">Thank you for taking the survey</p>`,
    startButtonText: "",
  },
};

export const API_URL = import.meta.env.VITE_API_URL;
export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL;

export const DEFAULT_IMAGE_BASE64_START = "data:image/jpeg;base64,";

export const rateupLogoStackedWhiteTransparent = `${imagesPath}/rateup-logo-stacked-white-transparent.png`;
export const rateupLogoStackedTransparent = `${imagesPath}/rateup-logo-stacked-transparent.png`;
export const rateupLogoHorizontalTransparent = `${imagesPath}/rateup-logo-horizontal-transparent.png`;
export const rateupLogoHorizontalWhiteTransparent = `${imagesPath}/rateup-logo-horizontal-white-transparent.png`;

export const MAX_DESCRIPTION_COUNT = 300;
export const MAX_METADATA_COUNT = 20;

export const CATALOG_PRODUCT_CONDITIONS = ["new", "refurbished", "used"];
export const CATALOG_PRODUCT_AVAILABILITY = [
  "in stock",
  "out of stock",
  "available for order",
  "discontinued",
];
export const CURRENCY_CODES = [
  "INR", // Indian Rupee
  "AED", // United Arab Emirates Dirham
  "KWD", // Kuwaiti Dinar
  "QAR", // Qatari Riyal
  "EUR", // Euro
  "USD", // United States Dollar
];

export const rateupUrl = "https://rateup.app";

export const WaMessageClosedStatus = [
  WaMessageAssignStatus.CLOSED,
  WaMessageAssignStatus.SPAM,
  WaMessageAssignStatus.RESOLVED,
  WaMessageAssignStatus.UNRESOLVED,
];

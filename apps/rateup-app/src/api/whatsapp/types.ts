export type WaTemplate = {
  id: string;
  createdAt: Date;
  data: {
    name: string;
    components: Array<any>;
    id: string;
    status: WaTemplateStatus;
    language: string;
    category: WaTemplateCategory;
  };
  acceptButton: string;
  orgId: string;
  templateType?: TemplateType;
};

export enum WaTemplateStatus {
  APPROVED = "APPROVED",
  PENDING = "PENDING",
  REJECTED = "REJECTED",
  DRAFT = "DRAFT",
}

export enum WaTemplateCategory {
  MARKETING = "MARKETING",
  UTILITY = "UTILITY",
  AUTHENTICATION = "AUTHENTICATION",
}

export enum TemplateType {
  GENERAL_NOTIFICATION = "GENERAL_NOTIFICATION",
  ORDER_DETAILS = "ORDER_DETAILS",
  PAYMENT_CONFIRMATION = "PAYMENT_CONFIRMATION",
  LOYALTY = "LOYALTY",
  CAROUSEL = "CAROUSEL",
}

 export type DbFlow = {
    dbFlowId: string;
    createdAt: Date;
    flowId: string;
    name: string;
    status: WaFlowStatus;
    json: WaFlowJson;
    map: any;
    logicJumps: {
      [screenId: string]: any[];
    };
    orgId: string;
    surveyId: string;
    templateMessage: WaFlowTemplateMessage;
    survey: any;
    startMessageConfig: WaFlowStartMessageConfig;
    pendingSave: boolean;
    anonymous: boolean;
    version: number;
    ticketIssued: FlowTicket[];
  };
   type FlowTicket = {
    questionId: string;
    type: any;
    selectedColumnId?: string;
    selectedBoardId?: string;
    condition: {
      minRating?: number;
      minOpinion?: number;
      reqOptions?: string[];
      submissionTicket?: boolean;
    };
  };
  export type WaFlowStartMessageConfig = {
  prefix: string;
  suffix: string;
};
 type WaFlowTemplateMessage = {
    header?: string;
    headerImage?: string;
    body: string;
    footer?: string;
    cta: string;
  };
  export enum WaFlowStatus {
  PUBLISHED = "PUBLISHED",
  DRAFT = "DRAFT",
  DEPRECATED = "DEPRECATED",
  BLOCKED = "BLOCKED",
  THROTTLED = "THROTTLED",
}

export type WaFlowJson = {
  version?: string;
  screens: Array<WaFlowScreen>;
  routing_model?: {
    [screenId: string]: Array<string>;
  };
  data_api_version?: string;
};
export type WaFlowScreen = {
  id: string;
  title: string;
  layout: WaFlowLayout;
  data?: any; // add types
  terminal: boolean;
};

export type WaFlowLayout = {
  type: WaFlowLayoutType;
  children: Array<WaFlowForm>;
};

export enum WaFlowLayoutType {
  scl = "SingleColumnLayout",
}

export type WaFlowForm = {
  type: string; // add types
  name: string;
  children: Array<WaFlowFormElement>;
};

export type WaFlowFormElement = {
  id: string; // for internal use only
  type: WaFlowFormElementType;
  text?: string;
  label?: string;
  name?: string;
  required?: boolean;
  "input-type"?: string; // add types
  "on-click-action"?: WaFlowOnClickAction;
  "data-source"?: Array<WaFlowFormChoice> | string;
  src?: string; // base64 of an image (required for Image type)
  width?: number;
  height?: number;
  "scale-type"?: "cover" | "contain";
  "aspect-ratio"?: number; // default
  "alt-text"?: string; // for accessibility (Talkback, voice over)
  "font-weight"?: string;
  strikethrough?: boolean;
  header?: string;
};

export type WaFlowFormChoice = {
  id: string;
  title: string;
};

export type WaFlowOnClickAction = {
  name: "navigate" | "data_exchange" | "complete"; // add types
  next?: {
    type: string; // add types
    name: string;
  };
  payload: any;
};

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
  photoPicker = "PhotoPicker",
  documentPicker = "DocumentPicker",
  if = "If",
  chipsSelector = "ChipsSelector",
}


export type WaSettings = {
  wabaId: string;
  phone: string;
  phoneId: string;
  accessToken: string;
  webhookPassword: string;
  appId: string;
  type: WaConfigType;
}[];


export enum WaConfigType {
  Manual = "Manual",
  Automated = "Automated", // through meta login
  Chatbot = "Chatbot",
}
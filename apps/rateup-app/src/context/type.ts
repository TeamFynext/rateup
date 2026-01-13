export type orgWsMessage = {
  type: "inbox";
  inbox?: {
    contact: ContactsData;
    message: WaGetMessagesBody;
  };
};

export type WaGetMessagesBody = {
  id: string;
  waContctId: string;
  createdAt: string;
  waCreatedAt: string;
  sendBy?:string;
  messageBody: any;
  templateComponentParams: any;
  stats?: { read: string; delivered: string; sent: string; error: string };
  sender?: {
    name?: string;
    profile_photo?: string;
  };
  messageId?: string;
  readUsers?: string[];
};

 type ContactsData = {
    id: string;
    name: string;
    phone: string;
    email: string;
    dob?: Date;
    source: string;
    createdAt: Date;
    tags?: any;
    consent: boolean;
    waMessageAssignStatus:any;
    whatsappUserName?: string;
    blockedOnWhatsApp: boolean;
    lastReceivedMessageTimeStamp?:string;
    loyaltyCustomer?: {
      id: string;
      email?: string;
      createdAt: Date;
      referralCodes: Array<{
        referralCode: string;
      }>;
      redeems: Array<{
        status: string;
      }>;
      totalEarnedPoints: number;
      redeemedPoints: number;
    };
    org: {
      whatsappSettings: {
        contactTags: string[];
      };
    };
    contactGroups?: [
      {
        contactGroup?: {
          name?: string;
        };
      },
    ];
    campaignParticipants: any[];
    aiWaChat: boolean;
  };


  export type WaTemplateFetchBody = {
  id: string;
  name: string;
  language: string;
  status: WaTemplateStatus;
  category: WaTemplateCategory;
  components: WaTemplateFetchBodyComponent[];
};

enum WaTemplateStatus {
  APPROVED = "APPROVED",
  PENDING = "PENDING",
  REJECTED = "REJECTED",
  DRAFT = "DRAFT",
}
enum WaTemplateCategory {
  MARKETING = "MARKETING",
  UTILITY = "UTILITY",
  AUTHENTICATION = "AUTHENTICATION",
}

enum WaTemplateComponentTypeUpperCase {
  BODY = "BODY",
  BUTTONS = "BUTTONS",
  HEADER = "HEADER",
  FOOTER = "FOOTER",
}

export type WaTemplateFetchBodyComponent = {
  type: WaTemplateComponentTypeUpperCase;
  format?: "IMAGE" | "VIDEO" | "DOCUMENT" | "TEXT" | "LOCATION";
  text?: string;
  example: {
    header_handle: string[];
    body_text?: [string[]];
  };
  buttons?: {
    type: any;
    text: string;
  }[];
};

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

export type WaTemplateComponent = {
  type: any;
  sub_type?: "quick_reply" | "list_reply" | "button_reply" | "nfm_reply";
  index?: number;
  parameters: WaTemplateParameter[];
};

type WaTemplateParameter = {
  type: WaTemplateSupportedParameters;
  text?: string;
  currency?: Currency;
  date_time?: DateTime;
  payload?: string;
  location?: Location;
  image?: Image;
  document?: Document;
};


type Currency = {
  fallback_value: string;
  code: string;
  amount_1000: number;
};

type DateTime = {
  fallback_value: string;
};

type Location = {
  latitude: string;
  longitude: string;
  name: string;
  address: string;
};
type Image = {
  link: string;
};

type Document = {
  link: string;
};

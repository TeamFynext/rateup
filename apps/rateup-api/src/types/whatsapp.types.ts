import {
  WaButtonType,
  WaFlowStatus,
  WaTemplateCategory,
  WaTemplateComponentType,
  WaTemplateComponentTypeUpperCase,
  WaTemplateStatus,
} from "./enums";

// TODO: find if there is an official type for this
export type WaMessageBody = {
  object: string;
  entry: [
    {
      id: string;
      changes: [
        {
          value: WaReceiveMessageBody;
          field: string;
        },
      ];
    },
  ];
};
export interface WaReceiveMessageBody {
  messaging_product: "whatsapp";
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts: [
    {
      profile: {
        name: string;
      };
      wa_id: string;
    },
  ];
  messages: [
    {
      from: string;
      id: string;
      timestamp: string;
      type: WaMessageTypes;
      text: {
        body: string;
      };
      interactive?: {
        type: "list_reply" | "button_reply" | "nfm_reply";
        list_reply: {
          id: string;
          title: string;
        };
        button_reply: {
          id: string;
          title: string;
        };
        nfm_reply: {
          response_json: string;
          name: string;
        };
      };
      image: {
        id: string;
        mime_type: string;
        sha256: string;
        link?: string;
        caption?: string;
      };
      button?: any;
    },
  ];
  statuses: [
    {
      id: string;
      status: string;
      timestamp: string;
      recipient_id: string;
      conversation: {
        id: string;
      };
    },
  ];
}
export interface WaSendMessageBody {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string; // PHONE_NUMBER type
  type:
    | "text"
    | "image"
    | "interactive"
    | "audio"
    | "document"
    | "contacts"
    | "sticker"
    | "location"
    | "template";
  text?: {
    preview_url?: boolean;
    body: string;
  };
  template?: WaTemplateFetchBody;
  image?: {};
  interactive?: {
    type:
      | "button"
      | "list"
      | "cta_url"
      | "flow"
      | "catalog_message"
      | "product"
      | "product_list";
    action?: WaInteractiveMessageAction;
    body?: {
      text: string; // max 1024 chars
    };
    footer?: {
      text: string; // max 60 chars
    };
    header?: {
      type: "text" | "image" | "video" | "document";
      text?: string; // max 60 chars
      image?: {
        link: string;
      };
      // add image, video, document if needed in future
    };
  };
}
type WaButton = {
  type: "reply";
  reply: {
    title: string; // max 20 chars
    id: string;
  };
};
type WaSection = {
  title?: string; // max 24 chars
  rows: Array<{
    title: string; // max 24 chars
    description?: string; // max 72 chars
    id: string;
  }>;
};
type WaInteractiveMessageAction = {
  name?: string;
  button?: string; // max 20 chars
  sections?: Array<WaSection>;
  buttons?: Array<WaButton>;
  parameters?: {
    display_text?: string;
    url?: string;
    flow_message_version?: number;
    flow_token?: string;
    flow_id?: string;
    flow_cta?: string; // text to be displayed on the button. max 20 chars
    flow_action_payload?: {
      screen: string; // id of the screen
      data?: any; // data to be sent to the screen
    };
    mode?: WaFlowStatus.DRAFT | WaFlowStatus.PUBLISHED;
  };
};

export enum WaMessageTypes {
  text = "text",
  image = "image",
  interactive = "interactive",
  button = "button",
}

export enum WaSessionType {
  survey = "survey",
  flow = "flow",
}

//type for waTemplate starts here

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

type WaTemplateLanguage = {
  code: string;
};

type WaTemplateComponent = {
  type: WaTemplateComponentType;
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

export type WaTemplate = {
  name: string;
  language: WaTemplateLanguage;
  components: WaTemplateComponent[];
};

//types for adding waTemplates to waCloud starts here
export type WaTemplateFetchBody = {
  id: string;
  name: string;
  language: string;
  status: WaTemplateStatus;
  category: WaTemplateCategory;
  components: (
    | {
        type: WaTemplateComponentTypeUpperCase.BODY;
        text: string;
      }
    | {
        type: WaTemplateComponentTypeUpperCase.HEADER;
        format: any;
        text: string;
      }
    | {
        type: WaTemplateComponentTypeUpperCase.FOOTER;
        text: string;
      }
    | {
        type: WaTemplateComponentTypeUpperCase.BUTTONS;
        buttons: {
          type: WaButtonType.QUICK_REPLY;
          text: string;
        }[];
      }
  )[];
};

import {
  CampaignParticipantStatus,
  PlatformType,
  WaButtonType,
  WaFlowStatus,
  WaMessageTypes,
  WaTemplateCategory,
  WaTemplateComponentTypeUpperCase,
  WaTemplateStatus,
  WaTemplateSupportedFormats,
  WHATSAPP_BUTTON_TYPE,
} from "./enum.js";

export interface WaTemplateButton {
  type: WHATSAPP_BUTTON_TYPE;
  text: string;
  phone_number?: string;
  url?: string;
  flow_id?: string;
  flow_action?: "navigate" | "data_exchange";
  navigate_screen?: string;
  example?: any;
}

export interface WaTemplateComponent {
  type: WaTemplateComponentTypeUpperCase;
  format?: WaTemplateSupportedFormats;
  text?: string;
  example?: any;
  buttons?: WaTemplateButton[];
}

export interface orgWsMessage {
  type: "inbox";
  inbox?: {
    contact: any;
    message: any;
  };
}

export interface WaButton {
  type: "reply";
  reply: {
    title: string; // max 20 chars
    id: string;
  };
}
export interface WaSection {
  title?: string; // max 24 chars
  rows: Array<{
    title: string; // max 24 chars
    description?: string; // max 72 chars
    id: string;
  }>;
}

export interface WaInteractiveMessageAction {
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
}

export interface WaTemplateFetchComponents {
  type: WaTemplateComponentTypeUpperCase;
  format?: "IMAGE" | "TEXT" | "LOCATION" | "DOCUMENT" | "VIDEO";
  text?: string;
  example?: {
    header_handle: string[];
  };
  buttons?: {
    type: WaButtonType.QUICK_REPLY;
    text: string;
  }[];
}

export interface WaTemplateFetchBody {
  id: string;
  name: string;
  language: string;
  status: WaTemplateStatus;
  category: WaTemplateCategory;
  components: WaTemplateFetchComponents[];
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
    type: "button" | "list" | "cta_url" | "flow" | "catalog_message" | "product" | "product_list";
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
      type?: string;
      payment?: {
        reference_id?: string;
        transaction?: {
          status?: string;
        };
      };
      errors?: any;
    },
  ];
}

export interface WaInboxMessageBody {
  exchangeProcess: "send" | "receive";
  send?: WaSendMessageBody;
  receive?: WaReceiveMessageBody;
}

export interface WaTemplateData {
  name: string;
  components: Array<any>;
  id: string;
  status: WaTemplateStatus;
  language: string;
  category: WaTemplateCategory;
  data: any;
}

export interface CreateWaMessageOrgTeamMapInput {
  // Nullable/optional to match the call sites: a message may have no team, and
  // the org is resolved from the contact when it is not passed in.
  teamId: string | null;
  messageId: string;
  orgId?: string;
  isAutomedMessage?: boolean;
  type: string;
}

export interface WaTemplateDefaultValues {
  image?: {
    link: string;
  };
  document?: {
    link: string;
    filename?: string;
  };
  video?: {
    link: string;
  };
}

export interface Message {
  id: string;
  phone: string;
  name: string;
  contact_tags: string[];
  teamId: string;
  orgId: string;
  defaultValues: any;
  dynamicTags: string[];
  wa_template: WaTemplateData;
  scheduledAt: Date;
  campaignMessageQueueId: string;
  retryCount: number;
  campaignId: string;
}

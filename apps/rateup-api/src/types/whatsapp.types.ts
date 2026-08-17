import {
  WaButtonType,
  WaTemplateCategory,
  WaTemplateComponentType,
  WaTemplateComponentTypeUpperCase,
  WaTemplateStatus,
  WaTemplateSupportedFormats,
} from "./enums.js";

/**
 * A template's review status changed (`message_template_status_update`).
 */
export interface WaTemplateStatusChange {
  event: WaTemplateStatus;
  message_template_id: number;
  message_template_name: string;
  message_template_language: string;
  reason: string | null;
}

/**
 * Meta reclassified a template (`template_category_update`).
 */
export interface WaTemplateCategoryChange {
  message_template_id: number;
  message_template_name: string;
  message_template_language: string;
  previous_category: string;
  new_category: string;
}

/**
 * The WABA itself was restricted or banned (`account_update`).
 */
export interface WaAccountUpdate {
  event?: string;
  ban_info?: { ban_status?: string; ban_date?: string };
  restriction_info?: Array<{ restriction_type?: string; expiration?: string }>;
}

/**
 * Meta decided on a requested display name (`phone_number_name_update`). The number is
 * identified by its formatted phone number, not its phone ID.
 */
export interface WaPhoneNumberNameUpdate {
  display_phone_number: string;
  decision: "APPROVED" | "REJECTED" | string;
  requested_verified_name: string;
  rejection_reason?: string | null;
}

/** Every payload shape a webhook `changes[].value` can carry. */
export type WaWebhookChangeValue =
  | WaReceiveMessageBody
  | LeadGenBody
  | WaTemplateStatusChange
  | WaTemplateCategoryChange
  | WaAccountUpdate
  | WaPhoneNumberNameUpdate;

// TODO: find if there is an official type for this
export interface WaMessageBody {
  object: string;
  entry: [
    {
      id: string; // waba_id
      changes: [
        {
          value: WaWebhookChangeValue;
          field: string;
        },
      ];
    },
  ];
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
      /** Quick-reply button tap: the label shown and the payload behind it. */
      button?: { text?: string; payload?: string };
      /**
       * Present when the WhatsApp user deleted a message they had sent (WhatsApp
       * Business app / coexistence only). Points at the message being revoked.
       */
      revoke?: {
        original_message_id: string;
      };
      order?: {
        catalog_id: string;
        text: string;
        product_items: {
          product_retailer_id: string;
          quantity: number;
          item_price: number;
          currency: string;
        }[];
      };
    },
  ];
  message_echoes?: [
    {
      from: string;
      to: string;
      id: string;
      timestamp: string;
      type: WaMessageTypes;
      text: {
        body: string;
      };
      image?: {
        id: string;
        mime_type: string;
        sha256: string;
        link?: string;
        caption?: string;
      };
      location?: {
        latitude: number;
        longitude: number;
        name?: string;
        address?: string;
      };
      contacts?: {
        name: {
          first_name: string;
          formatted_name: string;
        };
        phones: {
          phone: string;
          wai_id: string;
          type: string;
        }[];
      }[];
      /** Business side deleted a message it had sent (coexistence). */
      revoke?: {
        original_message_id: string;
      };
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
      /** Present on a failed status update; the same shape as a Graph API error. */
      errors?: WaGraphApiErrorDetail[];
    },
  ];
}

export interface WaMessageEchoBody {
  object: string;
  entry: [
    {
      id: string;
      changes: [
        {
          value: {
            messaging_product: "whatsapp";
            metadata: {
              display_phone_number: string;
              phone_number_id: string;
            };
            message_echoes: [
              {
                from: string;
                to: string;
                id: string;
                timestamp: string;
                type: WaMessageTypes;
                text: {
                  body: string;
                };
              },
            ];
          };
          field: "smb_message_echoes";
        },
      ];
    },
  ];
}

/** One answered field on a Meta lead form. */
export interface LeadGenFieldData {
  name: string;
  values: string[];
}

export interface LeadGenBody {
  [field: string]: unknown;
  leadgen_id: string;
  page_id: string;
  form_id: string;
  adgroup_id: string;
  ad_id: string;
  created_time: string;
}

export interface WaInternalMessageBody {
  messaging_product?: "whatsapp";
  recipient_type?: "individual";
  type?: "text";
  text: {
    body: string;
  };
  // Null when the actor triggering the event is a real user with no `name` set,
  // or a system/automation actor with no user id at all (see
  // `createInternalWaMessage` in wamessage.service.ts, which can genuinely fail
  // to resolve either half).
  triggeredByUser: {
    id: string | null;
    name: string;
  } | null;
  assignStatus?: string;
  assignedUsers?: {
    id: string;
    name: string;
  }[];
}

export interface WaPrivateMessageBody {
  messaging_product?: "whatsapp";
  recipient_type?: "individual";
  type?: "text";
  text: {
    body: string;
  };
  // See WaInternalMessageBody.triggeredByUser above.
  triggeredByUser: {
    id: string | null;
    name: string;
  } | null;
  mentionedUser?: {
    id: string;
    name: string;
  }[];
}

export interface WaSendMessageBody {
  messaging_product: "whatsapp";
  recipient_type?: "individual";
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
    | "template"
    | "reaction"
    | "video";
  text?: {
    preview_url?: boolean;
    body: string;
  };
  template?: OutgoingTemplatePayload;
  image?: {
    link: string;
    caption?: string;
  };
  interactive?: {
    type:
      | "button"
      | "list"
      | "cta_url"
      | "flow"
      | "catalog_message"
      | "product"
      | "product_list"
      | "order_details"
      | "order_status";
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
        link?: string;
        id?: string;
      };
      // add image, video, document if needed in future
    };
  };
  reaction?: {
    message_id: string;
    emoji: string;
  };
  document?: {
    link: string;
    caption?: string;
    filename?: string;
  };
  video?: {
    link: string;
    caption?: string;
  };
  audio?: {
    link: string;
  };
  contacts?: {
    addresses?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      country_code?: string;
      type?: string;
    }[];
    birthday?: string;
    emails?: {
      email?: string;
      type?: string;
    }[];
    name: {
      formatted_name: string;
      first_name?: string;
      last_name?: string;
      middle_name?: string;
      suffix?: string;
      prefix?: string;
    };
    org?: {
      company?: string;
      department?: string;
      title?: string;
    };
    phones: {
      phone: string;
      type?: string;
      wa_id?: string;
    }[];
    urls?: {
      url?: string;
      type?: string;
    }[];
  }[];
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}
interface WaButton {
  type: "reply";
  reply: {
    title: string; // max 20 chars
    id: string;
  };
}
interface WaSection {
  title?: string; // max 24 chars
  rows?: Array<{
    title: string; // max 24 chars
    description?: string; // max 72 chars
    id: string;
  }>;
  product_items?: Array<{
    product_retailer_id: string;
  }>;
}
interface WaInteractiveMessageAction {
  name?: string;
  button?: string; // max 20 chars
  sections?: Array<WaSection>;
  buttons?: Array<WaButton>;
  parameters?: {
    display_text?: string;
    url?: string;
    // Meta accepts "3"; callers in this repo send both the string and the number.
    flow_message_version?: number | string;
    flow_token?: string;
    flow_id?: string;
    flow_cta?: string; // text to be displayed on the button. max 20 chars
    // How the flow opens: straight to a screen, or via a data-exchange request.
    flow_action?: "navigate" | "data_exchange";
    flow_action_payload?: {
      screen: string; // id of the screen
      // Initial data for the screen, matching that screen's data schema.
      data?: Record<string, unknown>;
    };
    // Meta expects the lowercase form of WaFlowStatus.
    mode?: "draft" | "published";
    thumbnail_product_retailer_id?: string;
    // order_details / order_status: the order this message refers to.
    reference_id?: string;
    /** order_details only — e.g. "physical-goods". */
    type?: string;
    payment_settings?: Array<WaPaymentSetting>;
    currency?: string;
    total_amount?: WaMoney;
    order?: {
      status: "pending" | "processing" | "shipped" | "completed" | "canceled";
      /** order_details only; absent on a bare order_status update. */
      type?: string;
      items?: Array<{ name: string; amount: WaMoney; quantity: number }>;
      subtotal?: WaMoney;
      shipping?: WaMoney & { description?: string };
    };
  };
}

/** Meta sends money as a minor-unit integer plus the divisor that restores it. */
export interface WaMoney {
  value: number;
  offset: number;
}

export interface WaPaymentSetting {
  type: string;
  payment_gateway: {
    type: string;
    configuration_name: string;
    /** The gateway-specific block, keyed by the gateway's own name. */
    [gateway: string]: unknown;
  };
}

/**
 * The template payload on an OUTGOING message — name, language and the filled-in
 * components. Distinct from `WaTemplateFetchBody`, which is what Meta returns when
 * a template is read back (and carries id/status/category).
 */
export interface OutgoingTemplatePayload {
  name: string;
  language: { code: string };
  components?: OutgoingTemplateComponent[];
}

export enum WaMessageTypes {
  text = "text",
  image = "image",
  interactive = "interactive",
  button = "button",
  order = "order",
  revoke = "revoke",
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

// component type used while sending a template
export interface WaTemplateSendComponent {
  type: WaTemplateComponentType;
  sub_type?: "quick_reply" | "list_reply" | "button_reply" | "nfm_reply";
  index?: number;
  parameters: WaTemplateParameter[];
}
// component type used when creating a template
export interface WaTemplateComponent {
  type: WaTemplateComponentTypeUpperCase;
  format?: WaTemplateSupportedFormats;
  text?: string;
  /** Meta's sample values; media headers carry uploaded handles here. */
  example?: {
    header_handle?: string[];
    header_text?: string[];
    body_text?: string[] | string[][];
  };
  buttons?: WaTemplateButton[];
  cards?: {
    components: WaTemplateComponent[];
  }[];
  // Meta returns more fields than are modelled here, and callers reach them
  // through the looser WaMetaTemplateComponent view of the same payload.
  [field: string]: unknown;
}

/**
 * A template component as our code builds it for sending. Media parameters are
 * keyed by their own format at runtime ("image", "video", "document"), so the
 * parameter entries carry an index signature alongside their `type`.
 */
export interface OutgoingTemplateComponent {
  type: string;
  sub_type?: string;
  /** Button components carry their position; some callers pass it as a number. */
  index?: string | number;
  parameters?: Array<{ type: string; [mediaKey: string]: unknown }>;
  /** Carousel components carry one component list per card. */
  cards?: Array<{ card_index?: number; components: OutgoingTemplateComponent[] }>;
  /** Meta's component vocabulary is wider than what this repo builds by hand. */
  [field: string]: unknown;
}

export interface WaTemplateButton {
  // Create payloads use the lowercase names (WaButtonType), rows read back
  // from Meta use the uppercase ones. Payloads built from user input carry it
  // as a plain string until Meta validates it.
  type: WHATSAPP_BUTTON_TYPE | WaButtonType | string;
  /** Absent on a button whose label Meta supplies (e.g. an OTP copy-code button). */
  text?: string;
  phone_number?: string;
  url?: string;
  flow_id?: string;
  flow_action?: "navigate" | "data_exchange";
  navigate_screen?: string;
  /** Meta's sample values for the button (e.g. example URLs, coupon codes). */
  example?: string | string[];
  [field: string]: unknown;
}

export enum WHATSAPP_BUTTON_TYPE {
  QUICK_REPLY = "QUICK_REPLY",
  COPY_CODE = "COPY_CODE",
  PHONE_NUMBER = "PHONE_NUMBER",
  URL = "URL",
  FLOW = "FLOW",
  CATALOG = "CATALOG",
  MPM = "MPM",
  SPM = "SPM",
  ORDER_DETAILS = "ORDER_DETAILS",
}

interface WaTemplateParameter {
  type: WaTemplateSupportedParameters;
  text?: string;
  currency?: Currency;
  date_time?: DateTime;
  payload?: string;
  location?: Location;
  image?: Image;
  document?: Document;
}

interface Currency {
  fallback_value: string;
  code: string;
  amount_1000: number;
}

interface DateTime {
  fallback_value: string;
}

interface Location {
  latitude: string;
  longitude: string;
  name: string;
  address: string;
}
interface Image {
  link: string;
}

interface Document {
  link: string;
}

//types for adding waTemplates to waCloud starts here
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

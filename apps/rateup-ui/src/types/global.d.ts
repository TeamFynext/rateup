import type { LoyaltyRewardValue } from "@/backend/loyalty/reward.api";
import type { QuestionFormFeatures } from "@/backend/surveys/questions/questions.types.ts";
import type { SurveyThemePage } from "@/backend/surveyTheme/surveyTheme.types";
// Any modification to this file should be reflected in the backend
import type { UserAvailabilityStatus } from "@/backend/user/user.api";
import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";

import type { RequestPayload } from "./api.ts";
import type {
  CampaignPauseReason,
  CampaignRetryStrategy,
  CampaignSendStatus,
  CampaignSendTrigger,
  CampaignStatus,
  IntegratedApps,
  LogicAction,
  LogicCondition,
  LogicConditionComponentLevel,
  MenuItemPriceType,
  NPSWeightage,
  PageType,
  PaymentPlanStatus,
  QuestionType,
  SubscriptionFeaturePathName as sfpn,
  ShopifyEvents,
  StripeProductType,
  SurveyType,
  SurveyVariableType,
  WaAssignedChatPermission,
  WaAutomatedReplyMatchType,
  WaFlowFormElementType,
  WaFlowLayoutType,
  WaFailureReasonGroup,
  WaFlowStatus,
  WaMessageAssignStatus,
  WaMessageTypes,
  WaTemplateCategory,
  WaTemplateComponentType,
  WaTemplateComponentTypeUpperCase,
  WaTemplateStatus,
  WaTemplateSupportedParameters,
} from "./enums.ts";

type GoogleReview = {
  minRating?: number;
  minOpinion?: number;
  reqOptions?: Array<string>;
} | null;

interface TNC {
  title: string;
  urlTitle: string;
  content: string;
}

export interface Wop {
  imageSrc?: string;
  primaryColor: string;
  primaryColoraround: string;
  contrastColor: string;
  size: number;
  segments: string[];
  segColors: string[];
}

/**
 * A saved flowbot graph — React Flow's `toObject()` output as it round-trips
 * through the database, so the node/edge extras stay open.
 */
export interface WaAutomationFlowNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  [key: string]: unknown;
}

export interface WaAutomationFlowEdge {
  id: string;
  source: string;
  target: string;
  [key: string]: unknown;
}

export interface WaAutomationFlowJson {
  nodes: WaAutomationFlowNode[];
  edges: WaAutomationFlowEdge[];
  viewport?: { x?: number; y?: number; zoom?: number };
}

/**
 * A named web-survey theme. `theme` is the JSON column: one entry per themed
 * page ("surveyTheme", "welcomeTheme", "thankyouTheme", "languageTheme").
 */
export interface WebSurveyTheme {
  id: string;
  orgId: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  theme: Record<string, SurveyThemePage>;
}

export interface MenuLanding {
  success: boolean;
  data: Data;
}

export interface Data {
  id?: string;
  headerText?: string;
  headerStyle?: Style;
  titleStyle?: Style;
  otherStyle?: OtherStyle;
  logoStyles?: null;
  backgroundImage?: string;
  mobileBackgroundImage?: string;
  menuPageEnabled?: boolean;
  feedbackPageEnabled?: boolean;
  menuId?: string;
  menu: Menu;
  landingData?: boolean;
  surveyId?: string;
  catalogue?: boolean;
  surveyTeamMapId?: string;
  visited?: number;
  surveyTeamMap?: {
    surveyId?: string;
    shortUrlId?: string;
  };
  unsplashImage?: {
    backgroundImage: boolean;
    mobileBackgroundImage: boolean;
  };
  expiry?: string;
  subscription?: string | null;
}

export interface Style {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
}

export interface OtherStyle {
  color?: string;
  fontFamily?: string;
}

export interface ReviewSuggestion {
  id: string;
  teamId: string;
  review: string;
  language: string;
}

export interface WaFlowJson {
  version?: string;
  screens: Array<WaFlowScreen>;
  routing_model?: {
    [screenId: string]: Array<string>;
  };
  data_api_version?: string;
}
export interface WaFlowScreen {
  id: string;
  title: string;
  layout: WaFlowLayout;
  /** Screen-scoped payload passed through by the flow runtime. */
  data?: Record<string, unknown>;
  terminal?: boolean;
  /** Set on the terminal screen of a completed flow; stripped when rebuilding. */
  success?: boolean;
}
export interface WaFlowWa {
  // wa flow type from whatsapp
  name: string;
  id: string;
  status: WaFlowStatus;
}
export interface WaFlowLayout {
  type: WaFlowLayoutType;
  children: Array<WaFlowForm>;
}

export interface WaFlowForm {
  type: string; // add types
  name: string;
  children: Array<WaFlowFormElement>;
}

export interface WaFlowFormElement {
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
  // DatePicker bounds and its dynamic-data hook, set by
  // `updateFlowJsonNavigationAndDataPassing`.
  "min-date"?: string;
  "max-date"?: string;
  "on-select-action"?: WaFlowOnClickAction;
}

export interface WaFlowMap {
  [flowElementName: string]: {
    questionId: string;
    type: QuestionType;
    [key: string]: unknown; // Choices
  };
}

export interface WaFlowFormChoice {
  id: string;
  title: string;
}

export interface WaFlowOnClickAction {
  name: "navigate" | "data_exchange" | "complete"; // add types
  next?: {
    type: string; // add types
    name: string;
  };
  payload?: Record<string, unknown>;
}
export interface FlowLogicCondition {
  questionId: string;
  condition: LogicCondition;
  /** The compared answer: one option, or several for multi-select questions. */
  response?: string | string[];
}
export interface FlowLogicConditionComponentLevel {
  questionId: string;
  condition: LogicConditionComponentLevel;
  /** The compared answer: one option, or several for multi-select questions. */
  response?: string | string[];
}
export interface FlowLogicJump {
  conditions: Array<FlowLogicCondition>;
  /**
   * What to do when the conditions match: the id of the screen to jump to, or one of the
   * `LogicAction` names for the non-navigation outcomes.
   */
  action: LogicAction | string;
}
export interface LogicActionComponentLevel {
  success: LogicAction;
  fail: LogicAction;
}
/**
 * A component-level logic block. The v2 editor writes `If` blocks with
 * `then`/`else` component lists and `Switch` blocks with `cases`; older jumps
 * carry a single `action` instead.
 */
export interface FlowLogicJumpComponentLevel {
  type?: "If" | "Switch";
  /**
   * Condition rows. The flow editor writes question-level rows
   * (`questionId`/`condition`/`response`); the v2 element editor writes
   * component-level ones (`field`/`operator`/`value`), and both are stored
   * under the same key.
   */
  conditions: Array<{
    questionId?: string;
    condition?: LogicConditionComponentLevel;
    response?: string | string[];
    field?: string;
    operator?: string | null;
    value?: string | null;
    /** The join with the previous condition ("&&" / "||"). */
    logic?: string | null;
    isNumber?: boolean;
  }>;
  action?: LogicActionComponentLevel;
  then?: string[];
  else?: string[];
  value?: string;
  cases?: Record<string, Array<{ type: string }>>;
  screenId?: string;
}

interface Profile {
  bg: string;
  profileName: {
    color: string;
    fontSize: string;
    fontWeight: string;
  };
  profilePos: {
    color: string;
    fontSize: string;
    fontWeight: string;
  };
  profilePic: {
    isRemoved: boolean;
  };
}

interface DescriptionBlock {
  bg: string;
  desc: {
    color: string;
    fontSize: string;
    fontWeight: string;
  };
}

interface RatingBlock {
  bg: string;
  isRemoved: boolean;
  ratingType?: string;
}

interface DateBlock {
  color: string;
  fontSize: string;
  fontWeight: string;
  isRemoved: boolean;
}

type Layout = "vertical" | "horizontal"; // Assuming limited layouts

export interface TestimonialStyleType {
  root: {
    bg: string;
  };
  profileBlock: Profile;
  descBlock: DescriptionBlock;
  ratingBlock: RatingBlock;
  date: DateBlock;
  layout: Layout;
}

export interface Testimonial {
  id: string;
  createdAt: string;
  testimonial: {
    name: string;
    rating?: number;
    jobTitle?: string;
    questionId?: string;
    testimonial: string;
    photo?: string;
  };
  teamId: string;
  survey: {
    id: string;
    name: string;
  };
}

export interface WaAutomatedReplyMatchData {
  caseSensitive: boolean;
  json?: WaAutomationFlowJson;
}
export interface WaAutomatedReply {
  id: string;
  name: string;
  createdAt: Date;
  matchData: WaAutomatedReplyMatchData;
  commands: Array<string>;
  platform?: string; // "whatsapp" | "instagram"
  whatsappSettingsPhoneId: string;
}

//  types related to wa inbox
interface WaButton {
  type: "reply";
  reply: {
    title: string; // max 20 chars
    id: string;
  };
}

interface WaSection {
  title?: string; // max 24 chars
  rows: Array<{
    title: string; // max 24 chars
    description?: string; // max 72 chars
    id: string;
  }>;
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
      audio: {
        id: string;
        mime_type: string;
        sha256: string;
        voice?: boolean;
        caption?: string;
      };
      video: {
        id: string;
        mime_type: string;
        sha256: string;
        caption?: string;
      };
      document: {
        id: string;
        caption?: string;
        filename: string;
      };
      button?: {
        text: string;
        payload: string;
      };
      reaction?: {
        emoji: string;
        message_id: string;
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
        longitude: number;
        latitude: number;
        name: string;
        address: string;
      };
      order?: {
        text?: string;
        catalog_id: string;
        product_items: {
          currency: string;
          quantity: number;
          item_price: number;
          product_retailer_id: string;
        }[];
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
    },
  ];
}

export interface WaInternalMessageBody {
  messaging_product?: "whatsapp";
  recipient_type?: "individual";
  type?: "text";
  text: {
    body: string;
  };
  triggeredByUser: {
    id: string;
    name: string;
  };
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
  triggeredByUser: {
    id: string;
    name: string;
  };
  mentionedUser?: {
    id: string;
    name: string;
  }[];
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
    | "template"
    | "reaction";
  text?: {
    preview_url?: boolean;
    body: string;
  };
  template?: WaTemplateFetchBody;
  image?: {
    link: string;
    caption?: string;
  };
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
  reaction?: {
    emoji: string;
    message_id: string;
  };
  document?: {
    link: string;
    caption?: string;
    filename?: string;
  };
  audio?: {
    link: string;
  };
  video?: {
    link: string;
    caption?: string;
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
    longitude: number;
    latitude: number;
    name: string;
    address: string;
  };
}
interface WaInteractiveMessageAction {
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
      data?: Record<string, unknown>; // data to be sent to the screen
    };
    mode?: WaFlowStatus.DRAFT | WaFlowStatus.PUBLISHED;
  };
}

// instagram
export interface InstagramWebhookBody {
  object: "instagram";
  entry: [
    {
      time: number;
      id: string; // ID of your Instagram Professional account
      messaging: [
        {
          sender: {
            id: string; // Instagram-scoped ID for the customer
          };
          recipient: {
            id: string; //  recipient INSTAGRAM PAGE ID
          };
          timestamp: number;
          message?: {
            mid: string;
            text?: string;
            comment_id?: string; // Included when message originates from a comment (private reply flow)
            media_id?: string; // The post/reel/live media the comment was on
            /** Public instagram.com URL of that media, resolved when the comment arrived. */
            media_permalink?: string;
            attachments?: [
              // Included when a customer sends multiple media attachments or a URL for a story mention or share
              {
                type:
                  | "image"
                  | "video"
                  | "audio"
                  | "file"
                  | "sticker"
                  | "reel"
                  | "ig_reel"
                  | "share"
                  | "story_mention"
                  // A view-once photo or video; the payload url is not retrievable.
                  | "ephemeral";
                payload: { url: string };
              },
            ];
            is_deleted?: boolean; // Included when a customer deletes a message

            is_echo?: boolean; // Included when your business sends a message to the customer

            is_unsupported?: boolean; // Included when a customer sends a message with unsupported media

            quick_reply?: {
              // Included when a customer clicks a quick reply
              payload: string; // The payload with the option selected by the customer
            };

            referral?: {
              // Included when a customer clicks an Instagram Shop product
              product: {
                id: string;
              };
            };

            referral?: {
              // Included when a customer clicks an CTD ad
              ref: string;
              ad_id: string;
              source: "ADS";
              type: "OPEN_THREAD";
              ads_context_data: {
                ad_title: string;
                photo_url: string;
                video_url: string;
              };
            };

            reply_to?: {
              // Included when a customer sends an inline reply
              mid: string;
            };

            reply_to?: {
              // Included when a customer replies to a story
              story: {
                url: string; // CDN-URL
                id: string;
              };
            };
          };
          reaction?: {
            mid: string;
            action: "react" | "unreact";
            reaction?: string;
            emoji?: string;
          };
          read?: {
            mid: string;
          };
        },
      ];
    },
  ];
}

export interface IgSendMessageBody {
  recipient: {
    id: string;
  };
  message?: {
    text?: string;
    attachment?: {
      type: string;
      payload?: { id?: string; attachment_id?: string; url?: string };
      is_reusable?: boolean;
    };
  };
  sender_action?: "react" | "unreact";
  payload?: {
    message_id: string;
    reaction?: string;
    emoji?: string;
  };
}
export type IgReceiveMessageBody = InstagramWebhookBody["entry"][0]["messaging"][0];
// instagram

export interface WaInboxMessage {
  exchangeProcess: "send" | "receive" | "internal" | "privateNote";
  /** The composer writes the unused direction as `null` when adding a message optimistically. */
  send?: WaSendMessageBody | IgSendMessageBody | null;
  receive?: WaReceiveMessageBody | IgReceiveMessageBody | null;
  internal?: WaInternalMessageBody;
  privateNote?: WaPrivateMessageBody;
}

export interface WaTemplateFetchBody {
  id: string;
  name: string;
  language: string;
  status: WaTemplateStatus;
  category: WaTemplateCategory;
  components: WaTemplateFetchBodyComponent[];
}

export interface WaTemplateFetchBodyComponent {
  type: WaTemplateComponentTypeUpperCase;
  format?: "IMAGE" | "VIDEO" | "DOCUMENT" | "TEXT" | "LOCATION";
  text?: string;
  example: {
    header_handle: string[];
    body_text?: [string[]];
  };
  buttons?: WaTemplateFetchBodyButton[];
}

/**
 * A button on a fetched template. Meta returns one loose object per button and
 * which extras are set follows `type`, so the extras are optional here.
 * (The previous declaration referenced a `WaButtonType` enum that does not
 * exist; `skipLibCheck` hid that, and every read of `flow_id`/`url` had to go
 * through `any`.)
 */
export interface WaTemplateFetchBodyButton {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "FLOW" | "COPY_CODE" | "OTP";
  text: string;
  url?: string;
  phone_number?: string;
  flow_id?: string;
  flow_action?: string;
  navigate_screen?: string;
  example?: string[] | string;
}

interface WaTemplateLanguage {
  code: string;
}

export interface WaTemplateComponent {
  type: WaTemplateComponentType;
  sub_type?: "quick_reply" | "list_reply" | "button_reply" | "nfm_reply";
  index?: number;
  parameters: WaTemplateParameter[];
}

/**
 * Declared as a type alias, not an interface, so it also satisfies the looser
 * `{ type: string; [key: string]: unknown }` shape the template editor works against.
 */
type WaTemplateParameter = {
  type: WaTemplateSupportedParameters;
  /**
   * Literal text, or a reference the sender resolves at send time — a contact field or a
   * lead-form question key, as the flowbot's template editor writes them.
   */
  text?: string | { type: string; value?: string };
  currency?: Currency;
  date_time?: DateTime;
  payload?: string;
  location?: Location;
  image?: Image;
  video?: Video;
  document?: Document;
};

interface Currency {
  fallback_value: string;
  code: string;
  amount_1000: number;
}

interface DateTime {
  fallback_value: string;
}

export interface WaTemplateParameterLocation {
  latitude: string;
  longitude: string;
  name: string;
  address: string;
}
type Location = WaTemplateParameterLocation;
interface Image {
  link: string | File;
}

interface Document {
  link: string | File;
}

interface Video {
  link: string | File;
}

export interface WaTemplate {
  name: string;
  language: WaTemplateLanguage;
  components: WaTemplateComponent[];
}

export interface ChatBotMessage {
  content: string;
  source: ChatBotSource;
}
export interface WaFlowStartMessageConfig {
  prefix: string;
  suffix: string;
}
export interface Campaign {
  id: string;
  createdAt: Date;
  /** Included when the list endpoint joins the owning team. */
  teamName?: string;
  name: string;
  startedAt: Date;
  endedAt: Date;
  status: CampaignStatus;
  type: string;
  teamId: string;
  waTemplateId: string;
  campaignSentAt?: Date;
  /** Max messages dispatched per day. Null = dispatch every participant at once. */
  dailySendLimit?: number | null;
  /** Participants enrolled, when the list endpoint includes the aggregate. */
  campaignParticipantsCount?: number;
  /** The template's own name, joined by the list endpoint for the card. */
  templateName?: string | null;
  /** The whole joined WaTemplate row, as the single-campaign endpoint returns it. */
  templateData?: WaTemplate | null;
  /** Lifetime counters, joined by the list endpoint for the card's bar. */
  totalSent?: number;
  totalDelivered?: number;
  totalRead?: number;
  totalFailed?: number;
  /** Drip campaigns only: the ordered stages and their templates. */
  dripStages?: CampaignDripStage[];
  /** The flow a flow campaign sends, when its template carries a flow button. */
  flowId?: string | null;
  /** Template variables mapped to contact fields. */
  dynamicTags?: string[];
  /** Whether the send respects each contact's marketing consent. */
  useUserConsent?: boolean;
  /** IANA zone the schedule is expressed in, e.g. "Asia/Kolkata". */
  timezone?: string;
  /** Set by the survey share flow when the campaign targets one survey/team pair. */
  surveyTeamMapId?: string;
  /** Why a FAILED or PAUSED campaign stopped. Cleared when it is sent again. */
  errorMessage?: string | null;
  /** Why the platform paused it; only meaningful while `status` is PAUSED. */
  pauseReason?: CampaignPauseReason | null;
  pausedAt?: string | null;
}

/**
 * One send or resend of a campaign.
 *
 * Every outbound message belongs to exactly one, which is what makes "this retry
 * re-attempted 340 and 210 landed" a number the API can answer rather than an
 * estimate. Mirrors `CampaignSend` in rateup-api's prisma/schema.prisma, shaped
 * by `campaignAnalytics.service.ts`.
 */
export interface CampaignSend {
  id: string;
  /** 0 = the initial send. 1..n = automatic retries. */
  attemptNo: number;
  trigger: CampaignSendTrigger;
  status: CampaignSendStatus;
  /** "Initial send" / "Retry 1" / "Drip stage", computed server-side. */
  label: string;
  targetStatuses: string[];
  dripStageId: string | null;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalTargeted: number;
  /** Recipients dropped because the conversation allowance ran out. */
  totalSkipped: number;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  totalCompleted: number;
  /** Messages Meta accepted out of those attempted. */
  recovered: number;
  /** `recovered / totalTargeted`, or null when nothing has been attempted yet. */
  recoveryRate: number | null;
  note: string | null;
}

export interface CampaignSendParticipant {
  participantId: string;
  contactId: string;
  name: string | null;
  phone: string | null;
  status: string;
  errorMessage: string | null;
  errorCode: number | null;
  /** Customer-readable wording for `errorCode`, never "Graph error 131026". */
  errorLabel: string | null;
  sentAt: string | null;
}

export interface CampaignSendParticipantsPage {
  participants: CampaignSendParticipant[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CampaignFunnelStage {
  key: "attempted" | "sent" | "delivered" | "read" | "replied";
  label: string;
  count: number;
  /** Share of the stage above, so the drop-off reads without arithmetic. */
  rateOfPrevious: number | null;
  rateOfAttempted: number | null;
}

export interface CampaignFailureReason {
  group: WaFailureReasonGroup;
  label: string;
  description: string;
  count: number;
  /** How many of `count` the retry engine will pick up. */
  retryableCount: number;
  codes: { code: number | null; label: string; count: number; retryable: boolean }[];
}

export interface CampaignAnalytics {
  funnel: CampaignFunnelStage[];
  failures: CampaignFailureReason[];
  /** Failed *messages* across every attempt — a recipient a retry recovered is still counted. */
  totalFailed: number;
  /** Recipients whose current status is FAILED, i.e. what the failure breakdown adds up to. */
  activeFailed: number;
  /** Recipients not yet attempted or still awaiting an outcome. */
  activePending: number;
  /** Recipients dropped by the conversation allowance across every attempt. */
  totalSkipped: number;
  attemptCount: number;
}

/** Absent (null) means automatic retries are off for the campaign. */
export interface CampaignRetryPolicy {
  id: string;
  campaignId: string;
  enabled: boolean;
  strategy: CampaignRetryStrategy;
  /** 1-3 automatic attempts after the initial send. */
  maxAttempts: number;
  /** FIXED_INTERVAL only. */
  intervalHours: number;
  windowEndsAt: string | null;
  /** "HH:mm", local to `timezone`. Both ends or neither. */
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
}

/** One stage of a drip campaign. */
export interface CampaignDripStage {
  id?: string;
  waTemplateId?: string;
  delay?: number;
  delayUnit?: "minutes" | "hours" | "days";
  sendAtTime?: string;
}

// type for org websocket messages
export interface orgWsMessage {
  type: "inbox" | "message_status_update" | "message_deleted";
  inbox?: {
    contact: ContactsData;
    message: WaGetMessagesBody;
  };
  message_status_update?: {
    messageId: string;
    contactId: string;
    stats?: { read: string; delivered: string; sent: string; failed: string };
    timestamp: string;
    sourceIdentifier: string;
  };
  /** The customer revoked a message — the row stays, it just renders as deleted. */
  message_deleted?: {
    messageId: string;
    contactId: string;
    conversationId?: string | null;
    sourceIdentifier?: string | null;
    deletedAt: string;
    /** Identifies the message inside the inbox row's last-message preview. */
    waCreatedAt?: string | null;
  };
}

interface Integration {
  id: string;
  orgId: string;
  active: boolean;
  name: IntegratedApps;
}

export interface GoogleSheetCredential {
  accessToken: string;
  refreshToken: string;
  expiryDate: string;
  scopes: string[];
  userEmail: string | null;
}

export type GoogleSheetIntegration = Integration & {
  credential: GoogleSheetCredential;
};

export interface petpoojaCredential {
  restaurantId: string;
  orderEvent?: {
    waTemplateId: string;
    teamId: string;
    scheduleLater: boolean;
    sendAfter: string;
  };
  history?: {
    id: string;
    name: string;
    phone: string;
    status: string;
    scheduledAt?: Date;
    createdAt: Date;
  }[];
}

export type petpoojaIntegration = Integration & {
  credential: petpoojaCredential;
};

export interface ShopifyCredential {
  session: Session;
  isWebhookRegistered: boolean;
  shopifySurveys: ShopifySurvey[];
}

export type ShopifyIntegration = Integration & {
  credential: ShopifyCredential;
};

export interface AmeliaCredential {
  apiKey: string;
  baseUrl: string;
  serviceId: number;
}

export type AmeliaIntegration = integration & {
  credential: AmeliaCredential;
};

export interface ShopifySurvey {
  waTemplateId?: string;
  event: ShopifyEvents;
  isProductSpecific: boolean;
  productId?: string;
  teamId: string;
  timeDelay: number;
  surveyId?: string;
  active: boolean;
  schedules: ShopifySchedule[];
  createdAt: Date;
  repeatInterval: {
    value: number;
    unit: string; // "hour" | "day"
  };
  actionId?: string;
  loyaltyApiFeature?: string;
  variableMapping: { templateParamIndex: number; shopifyPath: string }[];
}

interface ScheduleObj {
  createdAt: Date;
  sentAt?: Date;
  scheduledAt: Date;
  status?: string;
}

export type ShopifySchedule = ScheduleObj & {
  phone: string;
  webhookId?: string;
  checkoutId?: string;
  actionStatus?: "success" | "failed";
  history: ScheduleObj[];
  apiStatus?: string;
  body?: RequestPayload;
};

export type ZapierIntegration = Integration & {
  credential: {
    accessToken: string;
    triggerSubscriptions: {
      hookUrl: string;
      subscribed_field: ZapierTriggers;
      active: boolean;
      zapId: string;
      createdAt: string;
      updatedAt: string;
    }[];
  };
};

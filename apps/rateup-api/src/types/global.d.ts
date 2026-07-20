// Any modification to this file should be reflected in the frontend
import { Contact, LoyaltyReward, Prisma, Role, WaMessage } from "../../../generated/prisma/client";
import {
  QuestionType,
  SmileyResponse,
  YNResponse,
  LDResponse,
  LogicAction,
  LogicCondition,
  WaTemplateStatus,
  NPSWeightage,
  SubscriptionFeaturePathName as sfpn,
  WaFlowFormElementType,
  IntegratedApps,
} from "./enums.js";
import { getSession } from "../modules/whatsapp/whatsappSurvey/wasurvey.service.js";
import prisma from "../utils/prisma.js";
import {
  WaInternalMessageBody,
  WaPrivateMessageBody,
  WaReceiveMessageBody,
  WaSendMessageBody,
  WaTemplateSendComponent,
} from "./whatsapp.types.js";
import { RouteShorthandOptionsWithHandler } from "fastify";
import { Session } from "@shopify/shopify-api";
import z from "zod";
import { ZapierTriggers } from "../modules/integrations/external/zapier/zapier.service.js";

type GoogleReview = {
  minRating?: number;
  minOpinion?: number;
  reqOptions?: Array<string>;
} | null;

type IssueTicket = {
  minRating?: number;
  minOpinion?: number;
  reqOptions?: Array<string>;
} | null;

interface TNC {
  title: string;
  urlTitle: string;
  content: string;
}

interface ValidationRules {
  length?: {
    min: string;
    max: string;
    errorMessage: string;
  };
  wordCount?: {
    min: string;
    max: string;
    errorMessage: string;
  };
  textType?: {
    type: string;
    errorMessage: string;
  } | null;
}

declare global {
  interface Choice {
    value: string;
    weightage?: NPSWeightage;
  }
  interface Question {
    title: Zod.RecordType<string, string>;
    description: Zod.RecordType<string, string>;
    required: boolean;
    type: QuestionType;
    choices?: Zod.RecordType<string, Array<Choice>>;
    features?: Zod.RecordType<string, Zod.RecordType<string, any>>;
    sections?: Zod.RecordType<string, WaSectionsType>; // only for whatsapp surveys
    label?: Zod.RecordType<string, string>; // only for whatsapp-flow surveys
    id: string;
    googleReview?: GoogleReview;
    ticketIssue?: IssueTicket;
    logic?: Array<LogicJump>;
    validationRules?: ValidationRules | any;
    tnc?: TNC;
    waAppName?: string;
    reviewPageOptions?: any;
    reviewPagePlatform?: string;
  }
  interface Question2 {
    id: string;
    type: QuestionType2;
    required?: boolean;
    label: string;
    name?: string;
    text?: string;
    metaType?: WaQuestions;
    header?: string;
    googleReview?: GoogleReview;
    "input-type"?: string;
    "left-caption"?: string;
    "right-caption"?: string;
    "data-source"?: Array<{ title: string; id: string }>;
    "on-click-action"?: {
      name: string;
      next?: {
        type: string;
        name: string;
      };
      payload: Record<string, unknown>;
    };
  }

  interface ResponseSummary {
    questionId: string;
    all: {
      summary: string;
      responseIds: string[];
    };
    team: {
      teamId: string;
      summary: string;
      responseIds: string[];
    }[];
  }

  interface Integration {
    id: string;
    orgId: string;
    active: boolean;
    name: IntegratedApps;
    createdAt: string;
  }

  interface GoogleSheetCredential {
    accessToken: string;
    refreshToken: string;
    expiryDate: string;
    scopes: string[];
    userEmail: string | null;
  }
  type GoogleSheetIntegration = Integration & {
    credential: GoogleSheetCredential;
  };
  interface ShopifyCredential {
    session: Session;
    isWebhookRegistered: boolean;
    shopifySurveys: ShopifySurvey[];
  }

  type ShopifyIntegration = Integration & {
    credential: ShopifyCredential;
  };

  interface petPoojaCredential {
    restaurantId: string;
    orderEvent: {
      waTemplateId: string;
      teamId: string;
      scheduleLater: boolean;
      timeDelay: number;
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

  type petPoojaIntegration = Integration & {
    credential: petPoojaCredential;
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
    // sendAfter: ShopifySendAfter;
    timeDelay: number;
    repeatInterval: {
      value: number;
      unit: "hour" | "day";
    };
    surveyId?: string;
    active: boolean;
    schedules: ShopifySchedules[];
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

  type ShopifySchedules = ScheduleObj & {
    phone: string;
    webhookId?: string;
    checkoutId?: string;
    actionStatus?: "success" | "failed";
    history: ScheduleObj[];
    apiStatus?: string;
    body?: any;
  };

  type ZapierIntegration = Integration & {
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
  type WaSectionsType = Array<{
    title?: string;
    rows: Array<{ id?: string; title: string; description?: string }>;
  }>;
  // This is NOT SurveyResponse. This indicates the response to a single question.
  // SurveyResponse.responses is an array of these.
  interface QuestionResponse {
    questionId: string;
    type: QuestionType;
    response: {
      [QuestionType.Text]?: string;
      [QuestionType.TextArea]?: string;
      [QuestionType.Number]?: number;
      [QuestionType.Email]?: {
        name?: string;
        phone?: string;
        email: string;
      };
      [QuestionType.Testimonial]?: {
        testimonial: string;
        name?: string;
        photo?: string;
        rating?: number;
        jobTitle?: string;
      };
      [QuestionType.EmailPhone]?: {
        email: string;
        phone: string;
      };
      [QuestionType.Contact]?: {
        name?: string;
        phone?: string;
        email?: string;
      };
      [QuestionType.LD]?: LDResponse;
      [QuestionType.YN]?: YNResponse;
      [QuestionType.Rating]?: number;
      [QuestionType.Smiley]?: SmileyResponse;
      [QuestionType.Opinion]?: number;
      [QuestionType.MCQ]?: Choice;
      [QuestionType.MSQ]?: Array<Choice>;
      [QuestionType.DDSS]?: Choice;
      [QuestionType.DDMS]?: Array<Choice>;
      [QuestionType.CustomNPS]?: Choice;
      [QuestionType.Phone]?: {
        name?: string;
        phone: string;
        email?: string;
      };
      [QuestionType.Photo]?: string;
      [QuestionType.Date]?: Date;
      [QuestionType.TnC]?: boolean;
      [QuestionType.WaList]?: { title: string; description?: string };
      [QuestionType.PhotoPicker]?: Array<{
        id: string;
        sha256: string;
        file_name: string;
        mime_type: string;
      }>;
      [QuestionType.DocumentPicker]?: Array<{
        id: string;
        sha256: string;
        file_name: string;
        mime_type: string;
      }>;
    };
  }
  interface LogicJump {
    condition: LogicCondition;
    response: string | string[]; // for (MSQ and DDMS) or (for conditions like includeAnyOf) it will be an array of indices of selected choices
    action: LogicAction;
  }
  interface WaTemplateWithTypes {
    id: string;
    createdAt: Date;
    whatsappSettingsPhoneId?: string;
    data: {
      name: string;
      components: Array<any>;
      id: string;
      status: WaTemplateStatus;
      language: string;
      category: WaTemplateCategory;
    };
    acceptButton?: string;
    orgId?: string;
    defaultValues?: WaTemplateDefaultValues;
  }
  type WaSessionWithRelations = Awaited<ReturnType<typeof getSession>>;

  interface subscriptionCountRestrictionCountType {
    max: number;
  }
  interface subscriptionCountRestriction {
    count: subscriptionCountRestrictionCountType;
  }
  interface subscriptionActiveField {
    active: boolean;
  }
  type subscriptionWithActiveAndCount = subscriptionCountRestriction & subscriptionActiveField;
  interface SubscriptionFeatures {
    // [subscriptionFeatureName] : {subfeatures & activeField & countRestriction}
    [sfpn.Team]: {
      teamMember: subscriptionCountRestriction & subscriptionActiveField;
    } & subscriptionActiveField &
      subscriptionCountRestriction;
    [sfpn.WebSurvey]: subscriptionActiveField &
      subscriptionCountRestriction & {
        encryption: subscriptionActiveField;
        googleReview: subscriptionActiveField;
        emailNotification: subscriptionActiveField;
        htmlCodePage: subscriptionActiveField;
        webhook: subscriptionActiveField;
        count: {
          monthlyResponseLimit: number;
        };
      };
    [sfpn.Whatsapp]: subscriptionActiveField & {
      conversation: subscriptionWithActiveAndCount;
    };
    [sfpn.ReputationManagement]: subscriptionActiveField & subscriptionCountRestriction;
    // Tickets are a free feature; kept optional for backward-compat with stored subscriptions.
    [sfpn.Ticket]?: subscriptionActiveField & subscriptionCountRestriction;
    [sfpn.AI]: subscriptionActiveField & {
      count: {
        completionTokens: number;
        promptTokens: number;
      };
    };
  }

  interface SPlan {
    id: string;
    name: string;
    paymentPlan?: {
      period: string;
      amount: number;
    };
    paymentPlanId?: string;
    displayName: string;
  }

  interface Subscription {
    orgId: string;
    features: SubscriptionFeatures;
    expiresAt: Date;
    renewedAt?: Date;
    createdAt: Date;
    basePlan: SPlan;
    isAnnualMessageLimit: boolean;
    subscriptionRef?: string;
    shopifyPlanId?: string;
  }
  interface WaFlowWa {
    // wa flow type from whatsapp
    name: string;
    id: string;
    status: WaFlowStatus;
    categories?: string[];
  }
  interface WaFlowJson {
    version: string;
    screens: Array<WaFlowScreen>;
    data_api_version: string;
    routing_model: Json;
  }

  interface FlowTicket {
    questionId: string;
    type: QuestionType2;
    selectedColumnId?: string;
    selectedBoardId?: string;
    condition: {
      minRating?: number;
      minOpinion?: number;
      reqOptions?: string[];
      submissionTicket?: boolean;
    };
  }

  interface WaFlowScreen {
    id: string;
    title: string;
    layout: WaFlowLayout;
    data: any; // add types
    terminal: boolean;
  }

  interface WaFlowLayout {
    type: WaFlowLayoutType;
    children: Array<WaFlowForm>;
  }

  interface WaFlowForm {
    type: string; // add types
    name: string;
    children: Array<WaFlowFormElement>;
  }

  interface WaFlowFormElement {
    id: string; // for internal use only. Should be removed before sending to whatsapp server
    type: WaFlowFormElementType;
    text?: string;
    label?: string;
    name?: string;
    required?: boolean;
    "input-type"?: string; // add types
    "on-click-action"?: WaFlowOnClickAction;
    "data-source"?: Array<WaFlowFormChoice>;
  }

  interface WaFlowFormChoice {
    id: string;
    title: string;
  }

  interface WaFlowOnClickAction {
    name: string; // add types
    next?: {
      type: string; // add types
      name: string;
    };
    payload: any;
  }
  interface WaFlowPreview {
    preview_url: string;
    expires_at: string;
  }
  interface WaFlowTemplateMessage {
    header?: string;
    headerImage?: string;
    body: string;
    footer?: string;
    cta: string;
  }
  interface WaAutomatedReplyMatchData {
    keywords?: Array<string>;
    exactText?: string;
    caseSensitive: boolean;
  }
  //--- instagram
  interface InstagramCommentValue {
    id: string; // comment ID
    text: string;
    from: {
      id: string; // Instagram-scoped ID of the commenter
      username: string;
    };
    media: {
      id: string;
      media_product_type?: "POST" | "AD" | "REEL" | "LIVE";
    };
    created_time: number;
    ad_id?: string;
    ad_title?: string;
  }

  interface InstagramWebhookBody {
    object: "instagram";
    entry: [
      {
        time: number;
        id: string; //ID of your Instagram Professional account
        changes?: [
          {
            field: "comments" | "live_comments";
            value: InstagramCommentValue;
          },
        ];
        messaging: [
          {
            sender: {
              id: string; // Instagram-scoped ID for the customer
            };
            recipient: {
              id: string; //  recipient INSTAGRAM PAGE ID
            };
            timestamp: number;
            postback?: {
              mid?: string;
              title?: string;
              payload?: string;
              referral?: {
                ref?: string;
                source?: string;
                type?: string;
              };
            };
            message?: {
              mid: string;
              text?: string;
              attachments?: Array<{
                // Included when a customer sends multiple media attachments or a URL for a story mention or share
                type:
                  | "image"
                  | "video"
                  | "audio"
                  | "file"
                  | "reel"
                  | "ig_reel"
                  | "share"
                  | "story_mention";
                payload: { url: string };
              }>;
              is_deleted?: boolean; // Included when a customer deletes a message

              is_echo?: boolean; // Included when your business sends a message to the customer

              is_unsupported?: boolean; // Included when a customer sends a message with unsupported media

              quick_reply?: {
                // Included when a customer clicks a quick reply
                payload: any; // The payload with the option selected by the customer
              };

              referral?:
                | {
                    // Included when a customer clicks an Instagram Shop product
                    product: {
                      id: string;
                    };
                  }
                | {
                    // Included when a customer clicks an CTD ad or ig.me link
                    ref: any;
                    ad_id?: string;
                    source: "ADS" | "SHORTLINKS";
                    type: "OPEN_THREAD";
                    ads_context_data?: {
                      ad_title: string;
                      photo_url: string;
                      video_url: string;
                    };
                  };

              postback?: {
                title?: string;
                payload?: string;
                referral?: {
                  ref?: string;
                  source?: string;
                  type?: string;
                };
              };

              reply_to?: {
                // Included when a customer sends an inline reply
                mid: string;
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

  interface IgSendMessageBody {
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
  type IgReceiveMessageBody = InstagramWebhookBody["entry"][0]["messaging"][0];

  interface FacebookWebhookBody {
    object: "page";

    entry: [
      {
        time: number;

        id: string; // Facebook Page ID

        messaging: [
          {
            sender: {
              id: string; // PSID (Page Scoped ID)
            };

            recipient: {
              id: string; // Facebook Page ID
            };

            timestamp: number;

            message?: {
              mid: string;

              text?: string;

              attachments?: [
                {
                  type: "image" | "video" | "audio" | "file" | "fallback";

                  payload: {
                    url?: string;
                  };
                },
              ];

              is_deleted?: boolean;

              is_echo?: boolean;

              is_unsupported?: boolean;

              quick_reply?: {
                payload: any;
              };

              reply_to?: {
                mid: string;
              };
            };

            reaction?: {
              mid: string;

              action: "react" | "unreact";

              reaction?: string;

              emoji?: string;
            };

            read?: {
              mid?: string;
              watermark?: number;
            };

            delivery?: {
              mids: string[];

              watermark: number;
            };

            postback?: {
              title?: string;

              payload?: string;

              referral?: {
                ref?: string;

                source?: string;

                type?: string;
              };
            };
          },
        ];
      },
    ];
  }

  interface FbSendMessageBody {
    recipient: {
      id: string;
    };

    message?: {
      text?: string;

      attachment?: {
        type: string;

        payload?: {
          url?: string;
          attachment_id?: string;
        };
      };

      quick_replies?: Array<{
        content_type: "text";
        title: string;
        payload: string;
      }>;
    };

    sender_action?: "typing_on" | "typing_off" | "mark_seen";
  }

  type FbReceiveMessageBody = FacebookWebhookBody["entry"][0]["messaging"][0];
  //---instagram

  interface WaInboxMessageBody {
    exchangeProcess: "send" | "receive" | "internal" | "privateNote";
    send?: WaSendMessageBody | IgSendMessageBody | FbSendMessageBody;
    receive?: WaReceiveMessageBody | IgReceiveMessageBody | FbReceiveMessageBody;
    internal?: WaInternalMessageBody;
    privateNote?: WaPrivateMessageBody;
  }
  interface WaTemplateDefaultValues {
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
    catalog?: {
      thumbnail_product_retailer_id?: string;
      mpm?: {
        sections: { title: string; products: [] }[];
      };
      spm?: {
        product_retailer_id: string;
      };
    };
  }
  interface WaFlowStartMessageConfig {
    prefix: string;
    suffix: string;
  }
  interface WaEncryptionKeys {
    publicKey: string;
    privateKey: string;
    passphrase: string;
  }

  interface LoyaltyActionMessage {
    message: any;
    forwardMessage?: any;
  }
  interface CatalogImage {
    url: string;
    tag: string[];
  }

  interface CatalogProductCore {
    type: "PRODUCT_ITEM";
    id: string;
    retailer_id: string;
    title: string;
    description: string;
    condition?:
      | "new"
      | "refurbished"
      | "used"
      | "used_like_new"
      | "used_good"
      | "used_fair"
      | "cpo"
      | "open_box_new";
    image?: CatalogImage[];
    internal_label?: string;
    link?: string;
    price: string;
    video?: CatalogImage[];
    availability: "in stock" | "out of stock" | "available for order" | "discontinued";
    brand: string;
    age_group?: "newborn" | "infant" | "toddler" | "kids" | "adult";
    color?: string;
    gender?: "male" | "female" | "unisex";
    pattern?: string;
    user_rating?: number;
    rating_count?: number;
    size?: string;
    image_link?: string;
    sale_price_effective_date?: string;
    sale_price: string;
    manufacturer_part_number?: string;
    item_group_id?: string;
    google_product_category?: string;
    disabled_capabilities?: string[];
    additional_image_link?: string[];
    currency?: string;
  }

  interface CatalogHotel {
    type: "HOTEL";
    name: string;
    latitude: string;
    longitude: string;
    url: string;
    address: Record<string, string>;
    base_price: string;
    sale_price: string;
    tags: string[]; // max 5 strings, each max 100 chars
    numbertags: number[]; // max 5 nonnegative ints
    description: string;
    hotel_id: string;
    image: CatalogImage[];
    id?: string;
  }

  interface CatalogHotelRoom {
    type: "HOTEL_ROOM";
    name: string;
    url: string;
    base_price: string;
    description: string;
    hotel_retailer_id: string;
    hotel_room_id: string;
    image: CatalogImage[];
    id?: string;
  }

  interface WhatsappCatalog {
    catalogId: string;
    orgId: string;
    vertical: string;
    name: string;
    isWhatsappConnected: boolean;
  }

  type WaCatalogProductItem = CatalogProductCore | CatalogHotel | CatalogHotelRoom;

  interface WaCatalogOrder {
    catalogId: string;
    products: {
      retailerId: string;
      quantity: number;
      price: number;
      currency: string;
    }[];
    contactId: string;
    paymentMethod?: string;
    paymentStatus: string;
    status: string;
    transactionId?: string;
  }

  // PRISMA JSON TYPES
  namespace PrismaJson {
    type PWaFlowJson = WaFlowJson;
    type PWaFlowPreview = WaFlowPreview;
    type PWaFlowTemplateMessage = WaFlowTemplateMessage;

    type PQuestion = Question;
    type PQuestionResponse = QuestionResponse;
    type PWaAutomatedReplyMatchData = WaAutomatedReplyMatchData;

    type PWaMessageBody = WaInboxMessageBody;
    type PWaTemplateWithTypesData = WaTemplateWithTypes["data"];
    type PWaTemplateComponentParams = WaTemplateSendComponent;
    type PWaTemplateDefaultValues = WaTemplateDefaultValues;
    type PWaFlowStartMessageConfig = WaFlowStartMessageConfig;
    type PWaEncryptionKeys = WaEncryptionKeys;
    type PWaCatalogProducts = WaCatalogProductItem[];
    type PWaCatalogOrders = WaCatalogOrder[];
  }

  interface LoyaltyApiSetting {
    id: string;
    orgId: string;
    feature: LoyaltyApiFeature;
    rules: {
      fields: { key: string; value: string }[];
    };
    action?: LoyaltyAction | null;
    reward?: LoyaltyReward | null;
    phoneKey: string;
    amountKey: string;
    actionId?: string;
    rewardId?: string;
    priority: number;
    active: boolean;
  }
}
export interface FlowLogicCondition {
  questionId: string;
  condition: LogicCondition;
  response: any;
}
export interface FlowLogicJump {
  conditions: Array<FlowLogicCondition>;
  action: LogicAction;
}

export interface orgWsMessage {
  type: "inbox";
  inbox?: {
    contact: Contact;
    message: WaMessage;
  };
}

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
    user: {
      userId: string;
      id: string;
      role: Role;
      orgId: string;
      email: string;
    };
    subscription: Subscription;
    features: Set<import("../../generated/prisma/client.js").TeamFeature>;
    can: (feature: import("../../generated/prisma/client.js").TeamFeature) => boolean;
  }
}

export interface CustomRouteShortHandOptions extends Omit<RouteShorthandOptions, "config"> {
  config: any;
}

export interface CustomRouteShortHandOptionsWithHandler extends Omit<
  RouteShorthandOptionsWithHandler,
  "config"
> {
  config: any;
}

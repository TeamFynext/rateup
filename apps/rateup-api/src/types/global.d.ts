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
import prisma from "../utils/prisma.js";
import {
  WaInternalMessageBody,
  WaPrivateMessageBody,
  WaReceiveMessageBody,
  WaSendMessageBody,
  WaTemplateComponent,
  WaTemplateSendComponent,
} from "./whatsapp.types.js";
import { RouteShorthandOptionsWithHandler } from "fastify";
import type { StoredShopifySession } from "../modules/integrations/shopify/shopify.session.js";
import z from "zod";
import { ZapierTriggers } from "../modules/integrations/external/zapier/zapier.service.js";

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
  /**
   * A single toggleable sub-field of a question's per-language `features` blob
   * (e.g. the `name`/`phone`/`email` toggles on a Contact question, or the
   * `other` option on a choice question).
   */
  interface QuestionFeatureToggle {
    isEnabled?: boolean;
    required?: boolean;
    title?: string;
  }
  /**
   * Per-language extra configuration for a question. Which keys are populated
   * depends on `Question.type`:
   * - Contact/Email/Phone/Testimonial: arbitrary sub-field keys -> QuestionFeatureToggle
   * - MCQGrid: `questions`
   * - MultiTextInput: `fields`
   * - choice questions: `other`
   * The index signature covers the type-dependent sub-field keys; readers must
   * narrow before use.
   */
  interface QuestionFeatures {
    questions?: string[];
    fields?: Array<{ fieldKey?: string; label?: string }>;
    other?: QuestionFeatureToggle;
    allowedEmails?: string[];
    [featureKey: string]: unknown;
  }
  interface Question {
    title: Record<string, string>;
    description: Record<string, string>;
    required: boolean;
    type: QuestionType;
    choices?: Record<string, Array<Choice>>;
    features?: Record<string, QuestionFeatures>;
    sections?: Record<string, WaSectionsType>; // only for whatsapp surveys
    label?: Record<string, string>; // only for whatsapp-flow surveys
    id: string;
    googleReview?: GoogleReview;
    logic?: Array<LogicJump>;
    validationRules?: ValidationRules;
    tnc?: TNC;
    waAppName?: string;
    reviewPageOptions?: Record<string, unknown>;
    reviewPagePlatform?: string;
    // Read/written by whatsapp-flow logic (flow.controller.ts) and defined in
    // question.schema.ts's Zod input schema, but was missing here.
    onSelectAction?: boolean;
    // Opts this question into NPS analytics; defined in question.schema.ts.
    enableNpsAnalytics?: boolean;
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
    // Opts this question into NPS analytics; defined in question.schema.ts.
    enableNpsAnalytics?: boolean;
  }

  /** `SurveyResponse.location` — where the respondent answered from. */
  /** One day's opening hours in a BusinessHour schedule. */
  interface BusinessHourDay {
    isOpen: boolean;
    timeSlots: Array<{ openTime: string; closeTime: string }>;
  }

  /** `BusinessHour.schedule` — opening hours keyed by weekday. */
  interface BusinessHourSchedule {
    monday: BusinessHourDay;
    tuesday: BusinessHourDay;
    wednesday: BusinessHourDay;
    thursday: BusinessHourDay;
    friday: BusinessHourDay;
    saturday: BusinessHourDay;
    sunday: BusinessHourDay;
  }

  interface ResponseLocation {
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    city?: string;
    state?: string;
    country?: string;
  }

  interface ResponseSummary {
    questionId: string;
    all?: {
      summary: string;
      responseIds: string[];
    };
    team?: {
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

  /**
   * `Contact.integrationIds` — links a Rateup contact to the records that
   * represent it in each external system, keyed by provider and then by record
   * kind (e.g. `{ zoho: { contact: { id }, lead: { id } } }`).
   */
  interface ContactIntegrationIds {
    zoho?: {
      contact?: { id?: string };
      lead?: { id?: string };
    };
    bigin?: {
      contact?: { id?: string };
      deal?: { id?: string };
    };
    getlead?: {
      lead?: { id?: string };
    };
    [provider: string]: Record<string, { id?: string } | undefined> | undefined;
  }

  interface GoogleSheetCredential {
    accessToken: string;
    refreshToken: string;
    expiryDate: string;
    scopes: string[];
    userEmail: string | null;
    driveFolderId?: string | null;
  }
  type GoogleSheetIntegration = Integration & {
    credential: GoogleSheetCredential;
  };
  interface ShopifyCredential {
    session: StoredShopifySession;
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
    // Assigned by callers via crypto.randomUUID() to correlate a schedule with
    // its BullMQ job and its own history entries (see shopify.service.ts).
    scheduleId?: string;
    createdAt: Date;
    // Persisted as an explicit `null` (not omitted) in the credential JSON blob
    // while a schedule is still pending, so this must accept null, not just
    // undefined, to match what's actually written to the DB.
    sentAt?: Date | null;
    scheduledAt: Date;
    status?: string | null;
  }

  type ShopifySchedules = ScheduleObj & {
    phone: string;
    webhookId?: string;
    checkoutId?: string;
    // Reserved for future use — always written as `null` today, never set to
    // "success"/"failed" by any code path.
    actionStatus?: "success" | "failed" | null;
    history: ScheduleObj[];
    apiStatus?: string | null;
    /** Raw Shopify webhook payload retained for retries/debugging. */
    body?: import("../modules/integrations/shopify/shopify.types.js").ShopifyWebhookBody;
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
  /**
   * A template as Meta's API represents it — both the payload we send to create
   * one (no `id`/`status` yet; Meta assigns those) and the row it returns.
   * Older stored rows keep a flattened form alongside `components`, so extra
   * fields are permitted.
   */
  /**
   * A component of a Meta template. Create payloads use the lowercase type
   * names, rows read back from Meta use the uppercase ones.
   */
  interface WaMetaTemplateComponent {
    type: WaTemplateComponentType | WaTemplateComponentTypeUpperCase | string;
    format?: string;
    text?: string;
    /** Meta's sample values; media headers carry uploaded handles here. */
    // body_text is documented as a list of example sets; this repo sends one flat set.
    example?: {
      header_handle?: string[];
      header_text?: string[];
      body_text?: string[] | string[][];
    };
    buttons?: Array<import("./whatsapp.types.js").WaTemplateButton>;
    cards?: Array<Record<string, unknown>>;
    [field: string]: unknown;
  }

  interface WaMetaTemplate {
    name: string;
    language?: string;
    category?: WaTemplateCategory | string;
    components?: WaMetaTemplateComponent[];
    id?: string;
    status?: WaTemplateStatus | string;
    allow_category_change?: boolean | null;
    [field: string]: unknown;
  }

  interface WaTemplateWithTypes {
    id: string;
    createdAt: Date;
    whatsappSettingsPhoneId?: string | null;
    data: {
      name: string;
      components: Array<WaTemplateComponent>;
      id: string;
      status: WaTemplateStatus;
      language: string;
      category: WaTemplateCategory;
    };
    acceptButton?: string | null;
    orgId: string;
    templateType?: import("../../generated/prisma/client.js").TemplateType;
    defaultValues?: WaTemplateDefaultValues | null;
  }
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
    // No `subscriptionCountRestriction` here on purpose: forms are not capped by how many
    // you build, only by how many responses they take in a month. See count below.
    [sfpn.WebSurvey]: subscriptionActiveField & {
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
      // Tier gates, optional for backward-compat with subscriptions stored before
      // they existed. Readers must treat "absent" deliberately — see canAccess.
      campaign?: subscriptionActiveField;
      loyalty?: subscriptionActiveField;
      referrals?: subscriptionActiveField;
      catalog?: subscriptionActiveField;
    };
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
    shopifyPlanId?: string | null;
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
    // Both only get populated by transformFlowAndLogicJumps (flow.utils.ts)
    // once logic jumps exist — a freshly-created flow's json legitimately
    // starts without them.
    data_api_version?: string;
    routing_model?: Json;
  }

  /**
   * One entry of `WaFlow.map`, keyed by form-element name. Always carries the
   * Survey question that element backs (`questionId`, `type`); choice-based
   * question types additionally carry numeric-string keys mapping a response
   * index to the choice label (see generateDataSourceFromQuestion's `mapData`).
   */
  interface WaFlowMapEntry {
    questionId: string;
    type: QuestionType;
    [responseIndex: string]: string | QuestionType | undefined;
  }

  /** `WaFlow.map` — form-element name -> the question that element backs. */
  type WaFlowMap = Record<string, WaFlowMapEntry>;

  /**
   * The map as it is handed *in* to createSurveyFromFlow: each entry names the
   * question type the form element backs, but has no `questionId` yet — that is
   * filled in once the Survey questions have been created.
   */
  interface WaFlowMapDraftEntry {
    questionId?: string;
    type: QuestionType;
    [responseIndex: string]: string | QuestionType | undefined;
  }

  type WaFlowMapDraft = Record<string, WaFlowMapDraftEntry>;

  /**
   * A raw answer as WhatsApp delivers it in a flow-response payload: a string
   * for text/date/single-choice elements, a number for numeric inputs, or an
   * array of choice ids for multi-select elements.
   */
  type WaFlowRawResponse = string | number | string[];

  /** Flow response payload: form-element payload name -> raw answer. */
  type WaFlowResponses = Record<string, WaFlowRawResponse | null | undefined>;

  /**
   * A v2 flow answer. v2 flows key responses by form-element id and use a
   * different question-type system (Question2/WaQuestions), so unlike v1 these
   * carry no `QuestionType` and hold the raw answer rather than a
   * QuestionType-keyed response object.
   */
  interface WaFlowV2QuestionResponse {
    questionId: string;
    response: WaFlowRawResponse;
  }

  /** What generateQuestionResponsesFromFlowResponse yields, per flow version. */
  type WaFlowQuestionResponse = QuestionResponse | WaFlowV2QuestionResponse;

  interface WaFlowScreen {
    id: string;
    title: string;
    layout: WaFlowLayout;
    /**
     * The screen's Flow-JSON data schema (JSON-Schema-shaped: `type`, `items`,
     * `properties`, `__example__`). Keys are screen-specific — e.g.
     * `available_slots` injected for date-picker screens by flow.utils.ts.
     */
    data: Record<string, unknown>;
    /** Only set on a flow's final screen; omitted elsewhere (e.g. the
     * address-collection flow built in catalogSettings.service.ts). */
    terminal?: boolean;
  }

  interface WaFlowLayout {
    type: WaFlowLayoutType;
    children: Array<WaFlowForm>;
  }

  /**
   * A child of a screen's layout. In v1 flows this is the "Form" wrapper whose
   * `children` hold the question elements; v2 flows put the question elements
   * at this level instead, which is why the Question2-style fields below are
   * present (and optional) here.
   */
  interface WaFlowForm {
    type: string; // add types
    /** Absent on non-interactive v2 elements (TextBody, TextHeading, ...). */
    name?: string;
    /** Only the v1 "Form" wrapper nests children; v2 elements are leaves. */
    children?: Array<WaFlowFormElement>;
    /** v2 only: the Meta component type backing this question. */
    metaType?: WaQuestions;
    /** v2 only: the element's stable id (injectIdToFlowJson). */
    id?: string;
    /** v2 only: opts the question into NPS analytics. */
    enableNpsAnalytics?: boolean;
    /** v2 only: google-review gating config for this question. */
    googleReview?: GoogleReview;
    /** v2 only: the question's selectable options. */
    "data-source"?: Array<WaFlowFormChoice>;
    /** v2 only: an external link, rewritten to an open_url action on export. */
    url?: string;
    /** v2 only: the element's display label. */
    label?: string;
    /** v2 only: heading text, lifted into its own TextBody element on export. */
    header?: string;
    /** Text elements only. */
    text?: string;
    markdown?: boolean;
    condition?: string;
    /** v2 interactive elements: whether an answer is mandatory. */
    required?: boolean;
    /** v2 elements: hidden elements are skipped by the preview and by Meta. */
    visible?: boolean;
    /** v2 text inputs: Meta's character cap. */
    "max-length"?: number;
    // Only present on the "Footer" variant of a screen's layout children —
    // this interface models every layout-child kind (Form, Footer, ...), so
    // it's optional here even though a real Footer node always has it.
    "on-click-action"?: WaFlowOnClickAction;
  }

  interface WaFlowFormElement {
    // For internal use only (injectIdToFlowJson assigns it, removeIdFromFlowJson
    // deletes it before sending to the WhatsApp server) — optional because it's
    // absent both before injection and after removal.
    id?: string;
    type: WaFlowFormElementType;
    text?: string;
    label?: string;
    name?: string;
    required?: boolean;
    "input-type"?: string; // add types
    "on-click-action"?: WaFlowOnClickAction;
    "data-source"?: Array<WaFlowFormChoice>;
    /** Date pickers only: the earliest selectable date (epoch millis string). */
    "min-date"?: string;
    /** Date pickers only: the latest selectable date (epoch millis string). */
    "max-date"?: string;
  }

  interface WaFlowFormChoice {
    id: string;
    title: string;
    /** Secondary line under the title; Rating choices carry the scale label here. */
    description?: string;
  }

  interface WaFlowOnClickAction {
    name: string; // add types
    next?: {
      type: string; // add types
      name: string;
    };
    /**
     * Maps a response key to a Flow form-binding expression (`${form.<name>}`);
     * findElementNameFromPayloadName parses these values as strings.
     */
    payload?: Record<string, string>;
    /** Present on `open_url` actions instead of a payload. */
    url?: string;
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
  /** Restricts which contacts an automation fires for. */
  interface WaAutomationContactFilters {
    /** Only fire for contacts created in the last 24 hours. */
    newContactsOnly?: boolean;
    /** Contact-group ids the contact must belong to (any of). */
    inGroups?: string[];
    /** Custom-field ids the contact must have a value for. */
    requiredFieldsWithAnyValue?: string[];
  }

  interface WaAutomatedReplyMatchData {
    keywords?: Array<string>;
    exactText?: string;
    /** Keyword automations only; flow-builder automations do not set it. */
    caseSensitive?: boolean;
    contactFilters?: WaAutomationContactFilters;
    /**
     * Present on flow-builder automations: the node/edge graph driving the
     * conversation. Keyword-only automations have no `json`.
     */
    json?: import("../modules/whatsapp/whatsappSurvey/node-types.js").AutomationGraph;
  }
  /**
   * A ProseMirror/TipTap-style rich-text document, as stored in
   * `LoyaltyWaCommand.content`. Text lives on leaf nodes; `content` nests.
   */
  interface RichTextNode {
    type?: string;
    text?: string;
    content?: RichTextNode[];
    [key: string]: unknown;
  }

  /**
   * The `error` object Meta returns on a failed Graph API call, as captured on
   * `WaMessage.logs`. Fields vary by failure, so all are optional.
   */
  interface WaGraphApiErrorDetail {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_data?: { details?: string };
    fbtrace_id?: string;
    [key: string]: unknown;
  }

  /**
   * Type-specific payload on a loyalty ApprovalRequest. Which fields are set depends
   * on `requestType`, so each is optional and read only by its own approver.
   */
  interface ApprovalRequestData {
    newTierId?: string;
    previousTierId?: string;
    suspensionReason?: string;
    operation?: string;
    accountIds?: string[];
    [key: string]: unknown;
  }

  /** Parameters on an outgoing `catalog_message` interactive action. */
  interface WaCatalogActionParameters {
    thumbnail_product_retailer_id?: string;
  }

  /**
   * The runtime values substituted into a template's placeholders when it is sent.
   * `header` is the media link (or location text) for a media/location header.
   */
  interface WaTemplateParameterData {
    header?: string;
    [key: string]: unknown;
  }

  /** `WhatsappSettings.conversionData` — how Meta Conversions API events are labelled. */
  interface MetaConversionSettings {
    event_name?: string;
    currency?: string;
  }

  /** The `custom_data` block on a Meta Conversions API event. */
  interface MetaConversionCustomData {
    /**
     * Always the constant `"Won"`. Kept because custom conversions and audiences
     * defined in Meta's dashboard may already key off it — dropping the field
     * would silently break them. `pipeline_stage` is where the real detail is.
     */
    lifecycle_stage?: string;
    /** The board column that closed the lead, e.g. `"Won"` or `"Closed Won"`. */
    pipeline_stage?: string;
    currency?: string;
    value?: number;
  }

  /** `LoyaltyRedemption.usedContext` — where and how a redemption was consumed. */
  interface LoyaltyUsedContext {
    locationId?: string;
    orderId?: string;
    notes?: string;
    shortCode?: string;
    redemptionType?: string;
    [key: string]: unknown;
  }

  /**
   * `Linktree.links` — one entry per link on a linktree page. The editor lets users add
   * presentation fields freely, so only what the server reads or writes is named.
   */
  interface LinktreeLink {
    id?: string;
    noOfClicks?: number;
    [field: string]: unknown;
  }

  /** Every property optional, all the way down. */
  type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
  };

  /**
   * A `Subscription.features` blob in whatever schema version it was written in — a
   * subset of the current shape, plus retired keys the migrations still read. The
   * migration reads it defensively (`f.team?.count?.max ?? 1`), so nothing is required.
   */
  type LegacySubscriptionFeatures = DeepPartial<SubscriptionFeatures> & {
    /** Retired: whatsapp sub-features flattened into `conversation`. */
    whatsapp?: DeepPartial<SubscriptionFeatures["whatsapp"]> & {
      template?: Record<string, unknown>;
      automation?: Record<string, unknown>;
    };
    /** Retired: reputation management is no longer offered. Read only by migrations. */
    reputationManagement?: { active?: boolean; count?: { max?: number } };
  };

  interface LoyaltyTimeRange {
    start: string;
    end: string;
  }

  /**
   * `LoyaltyEarningRule.allowedTimeRanges` — the windows a rule may earn in. Written as a
   * bare array (see the schema comment); older rows wrap it under `time_ranges`.
   */
  type LoyaltyAllowedTimeRanges = LoyaltyTimeRange[] | { time_ranges?: LoyaltyTimeRange[] };

  /**
   * The `data` blob on a send-email/generate-OTP request. Which keys are populated
   * depends on the request's `purpose`, so all are optional.
   */
  interface EmailTemplateData {
    surveyName?: string;
    otp?: string;
    body?: string;
    buttonLink?: string;
    title?: string;
    [key: string]: unknown;
  }

  /**
   * RETIRED: ticket boards were removed, but `TicketCard.checklists` still carries the
   * `/// [PTicketChecklists]` annotation in schema.prisma, and the generated client
   * (generated/prisma/models/TicketCard.ts) references the type below. It has to stay
   * until the Ticket* tables are dropped. Nothing in src/ reads it.
   */
  interface TicketChecklistItem {
    id: string;
    text?: string;
    isCompleted?: boolean;
  }

  /** `TicketCard.checklists` — a named group of checklist items. */
  interface TicketChecklist {
    id: string;
    name?: string;
    items?: TicketChecklistItem[];
  }

  /** The testimonial sub-answer, built up field-by-field across several WhatsApp replies. */
  type TestimonialResponse = NonNullable<QuestionResponse["response"][QuestionType.Testimonial]>;

  /**
   * A media answer as WhatsApp reports it before the file is downloaded and re-uploaded to S3.
   * `sha256` is what marks a stored response as still pointing at WhatsApp-hosted media.
   */
  interface WaMediaResponseItem {
    id?: string;
    sha256?: string;
    file_name?: string;
    mime_type?: string;
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
    /**
     * Absent on live webhook deliveries; only Graph API reads carry it, and
     * those return an ISO string rather than the unix seconds a webhook uses.
     */
    created_time?: number | string;
    /** Set when the comment is a reply to another comment. */
    parent_id?: string;
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
                payload: string; // The payload with the option selected by the customer
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
                    ref: string;
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
                payload: string;
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

  /**
   * One side of a WaInboxMessageBody — the payload as sent or as received. Some callers
   * synthesize a partial envelope (webchat echoes, Facebook postback/quick-reply events);
   * those are stored verbatim, so the record arm covers them. Readers must narrow.
   */
  type WaMessagePayload =
    | WaSendMessageBody
    | IgSendMessageBody
    | FbSendMessageBody
    | WaReceiveMessageBody
    | IgReceiveMessageBody
    | FbReceiveMessageBody
    | WaInternalMessageBody
    | WaPrivateMessageBody
    | import("./whatsapp.types.js").WaWebhookChangeValue
    | Record<string, unknown>;

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
    whatsappSettingsPhoneId?: string;
    catalog?: {
      thumbnail_product_retailer_id?: string;
      mpm?: {
        sections: { title: string; products: string[] }[];
      };
      spm?: {
        product_retailer_id: string;
      };
      catalogId: string;
    };
    mediaCarousel?: {
      headerLink: string;
      cardIndex: number;
      quickReplyPayload?: string;
    }[];
    productCarousel?: {
      product_retailer_id: string;
      cardIndex: number;
    }[];
    orderDetails?: {
      paymentConfigName: string;
      paymentType: string;
      productType: string;
      item: {
        name: string;
        salePrice: number;
        price: number;
        quantity: number;
        origin: string;
        importerName: string;
        importerAddress1: string;
        importerCity: string;
        importerZoneCode: string;
        importerPostalCode: string;
      };
      shipping: number;
      tax: number;
      discount?: number;
      discountDescription?: string;
      taxDescription: string;
      expiry?: string;
    };
  }
  /**
   * `WaTemplate.config` — the priced item an order-details template quotes.
   */
  interface WaTemplateConfig {
    price: number;
    name: string;
    tax: number;
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
    message: WaSendMessageBody;
    forwardMessage?: WaSendMessageBody;
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
    /** Meta stores this as a list of labels, quoted; see the Shopify sync. */
    internal_label?: string[];
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

  /**
   * `WhatsappCatalog.standardPaymentConfig` — the merchant's own payment
   * details, shown to the customer at checkout for a "standard" (non-Shopify)
   * store. Which subset is filled depends on `standardPaymentMethod`.
   */
  interface WaCatalogPaymentConfig {
    upiId?: string;
    upiDisplayName?: string;
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
    holderName?: string;
    status?: string;
  }

  /**
   * One selectable delivery method on a catalog — either configured by the
   * merchant or derived from Shopify's available shipping rates.
   */
  interface WaCatalogDeliveryOption {
    id: string;
    name: string;
    charge: number;
    enabled: boolean;
    /** Estimated delivery time in days, when the merchant supplied one. */
    days?: string;
  }

  /**
   * The delivery choice stored on an order. Usually a WaCatalogDeliveryOption
   * the customer picked, but when the catalog charges a flat rate the code
   * synthesizes a pseudo-option carrying only a name and charge, so every field
   * except `charge` is optional here.
   */
  type WaCatalogSelectedDelivery = Partial<WaCatalogDeliveryOption> & { charge: number };

  /** `WaCatalogOrder.shippingAddress` — collected via the address flow. */
  interface WaCatalogShippingAddress {
    name?: string;
    phone?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    zip?: string;
    country?: string;
    country_code?: string;
    [field: string]: string | undefined;
  }

  /**
   * One line of `WaCatalogOrder.products` as stored. The WhatsApp order webhook
   * writes `price`/`quantity` as strings while other paths write numbers, so
   * readers parse both (see calculateOrderTotal); every field is optional
   * because older rows predate some of them.
   */
  interface WaCatalogOrderProduct {
    retailerId: string;
    currency: string;
    quantity?: string | number;
    price?: string | number;
    title?: string;
  }

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
    type PWaFlowMap = WaFlowMap;
    type PWaFlowPreview = WaFlowPreview;
    type PWaFlowTemplateMessage = WaFlowTemplateMessage;

    type PQuestion = Question;
    type PQuestionResponse = QuestionResponse;
    type PResponseLocation = ResponseLocation;
    type PBusinessHourSchedule = BusinessHourSchedule;
    type PLoyaltyPendingBonuses = import("./loyalty.js").LoyaltyPendingBonuses;
    type PWaAutomatedReplyMatchData = WaAutomatedReplyMatchData;

    type PWaMessageBody = WaInboxMessageBody;
    type PWaTemplateWithTypesData = WaTemplateWithTypes["data"];
    // The column stores the filled-in component ARRAY of the template that was sent —
    // `messageBody.template.components` verbatim.
    type PWaTemplateComponentParams = import("./whatsapp.types.js").OutgoingTemplateComponent[];
    type PWaTemplateDefaultValues = WaTemplateDefaultValues;
    type PWaTemplateConfig = WaTemplateConfig;
    type PWaFlowStartMessageConfig = WaFlowStartMessageConfig;
    // Keyed by screen id — see WaFlow.logicJumps in schema.prisma.
    type PWaFlowLogicJumps = Record<string, FlowLogicJump[]>;
    type PWaEncryptionKeys = WaEncryptionKeys;
    // The stored copy of a catalog row's fields, as sent to Meta. Prices come back as
    // "10.00 USD" strings, so this is Partial rather than the strict input type.
    type PWaCatalogProductProps = Partial<CatalogProductCore>;
    type PWaCatalogProducts = WaCatalogProductItem[];
    type PWaCatalogOrders = WaCatalogOrder[];
    type PWaCatalogPaymentConfig = WaCatalogPaymentConfig;
    type PWaCatalogDeliveryOptions = WaCatalogDeliveryOption[];
    type PWaCatalogDeliveryOption = WaCatalogSelectedDelivery;
    type PWaCatalogShippingAddress = WaCatalogShippingAddress;
    type PWaCatalogOrderProduct = WaCatalogOrderProduct;

    type PMetaAgentBusinessInfo =
      import("../modules/metaAgent/metaAgent.schema.js").BusinessInfoBody;
    /** Meta's FAQ metadata is a flat string map. */
    type PMetaAgentFaqMetadata = Record<string, string>;
    /** Skill metadata is the same flat string map as FAQ metadata. */
    type PMetaAgentSkillMetadata = Record<string, string>;
    /** An OpenAPI-ish request spec Meta stores verbatim for a connector tool. */
    type PMetaAgentRequestDefinition =
      import("../modules/metaAgent/metaAgent.schema.js").RequestDefinition;
    type PMetaAgentUserAuthInjectionConfig = {
      location: "body" | "headers" | "path" | "query";
      field_name: string;
      prefix: string;
    };
    type PMetaAgentUserAuthActionConfig = {
      user_action_tool_type: "auth" | "refresh";
      user_auth_token_path: string;
      refresh_token_path?: string;
      expires_at_path?: string;
      expires_at_type?: "absolute" | "relative_seconds";
    };
    /** Meta's agent_budget list, as last read or saved. */
    type PMetaAgentBudgets = import("../modules/metaAgent/metaAgent.schema.js").AgentBudget[];
    /** Non-secret mTLS metadata Meta echoes back after a certificate upsert. */
    type PMetaAgentMtlsConfig = {
      has_certificate: boolean;
      fingerprint?: string;
      expires_at?: number;
      subject?: string;
    };
    /** `ApprovalRequest.requestData` — the fields specific to each request type. */
    type PApprovalRequestData = ApprovalRequestData;
    type PMetaConversionSettings = MetaConversionSettings;
    // Either one of the three known discount/free-item shapes or, for reward types
    // that predate them, a free-form value blob.
    type PLoyaltyRewardValue =
      | import("./loyalty.js").LoyaltyRewardValue
      | (Record<string, unknown> & { points?: number });
    type PLoyaltyUsedContext = LoyaltyUsedContext;
    type PContactIntegrationIds = ContactIntegrationIds;
    type PLinktreeLinks = LinktreeLink[];
    // Rows written before the current schema keep older shapes; readers migrate them
    // (see migrateFeaturesToCurrentSchema), so the stored type is the legacy superset.
    type PSubscriptionFeatures = LegacySubscriptionFeatures;
    // Either a plain outgoing message or the payment order-details message, which has a
    // wider interactive action than WaSendMessageBody models.
    type PWaScheduledMessageBody =
      | import("./whatsapp.types.js").WaSendMessageBody
      | Record<string, unknown>;
    type LoyaltyEarningRuleTimeRanges = LoyaltyAllowedTimeRanges;
    type PWaRuleOptions =
      import("../modules/whatsapp/automatedReply/wa_rule.schema.js").RuleOptions;
    type PTicketChecklists = TicketChecklist[];
    type PRichTextContent = RichTextNode | string;
    type PWaGraphApiErrorDetail = WaGraphApiErrorDetail;
    type PInstagramIceBreakers = InstagramIceBreaker[];
    type PInstagramPersistentMenu = InstagramPersistentMenuEntry[];
    type PLeadActivityDetails = LeadActivityDetails;
  }

  /**
   * `LeadActivity.details` — the metadata a timeline entry needs to render without
   * re-reading the rows it describes. Every field is optional: which ones are set
   * depends on the activity `type`.
   */
  interface LeadActivityDetails {
    fromStageName?: string;
    toStageName?: string;
    addedNames?: string[];
    removedNames?: string[];
    lostReasonLabel?: string;
    note?: string;
    lifecycleName?: string;
    taskTitle?: string;
    sourceLabel?: string;
    automated?: boolean;
    /** Which integration a sync entry concerns, e.g. "GetLead". */
    integrationName?: string;
    /** The lead's id in that integration, on a successful sync. */
    externalId?: string;
    /** True when the record was opened rather than updated. */
    externalCreated?: boolean;
    /**
     * Why a sync did not happen. A stable code, not prose — the UI turns it into
     * a translated sentence. Currently only `NO_PHONE`.
     */
    skipReason?: string;
    /**
     * The mapped status was refused by the integration's workflow and dropped;
     * everything else on the lead still synced.
     */
    statusRejected?: boolean;
    /**
     * The status named by an inbound change, as the integration spelled it —
     * GetLead sends a display name, not an id.
     */
    statusName?: string;
    /**
     * The lead itself was opened by an inbound delivery, rather than an existing
     * one being moved. Distinct from {@link externalCreated}, which is about the
     * record we created on the integration's side.
     */
    inboundCreated?: boolean;
  }

  /** One tappable prompt shown before an Instagram conversation starts. */
  interface InstagramIceBreaker {
    question: string;
    payload: string;
  }

  interface InstagramMenuAction {
    type: "postback" | "web_url";
    title: string;
    payload?: string;
    url?: string;
  }

  /** Persistent menu is declared per locale — Meta picks the entry matching the user. */
  interface InstagramPersistentMenuEntry {
    locale: string;
    call_to_actions: InstagramMenuAction[];
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
  /** The choice id / literal the answer is compared against. */
  response: string;
}
/** v2 logic jumps name the elements to reveal on each branch. */
export interface FlowLogicBranchAction {
  success?: string;
  fail?: string;
}

export interface FlowLogicJump {
  conditions: Array<FlowLogicCondition>;
  /**
   * v1 jumps store either a `LogicAction` verb or the id of the screen to jump
   * to; v2 jumps store a branch action instead. Readers discriminate with
   * `typeof action === "string"` (see flow.utils.ts / flow.service.ts).
   */
  action: string | FlowLogicBranchAction;
}

export interface orgWsMessage {
  type: "inbox" | "message_deleted" | "meta_agent_thread";
  inbox?: {
    /** Contact plus the ticket the message landed on — the inbox list is keyed by ticket. */
    contact: Contact & { conversationId?: string | null; conversationStatus?: string | null };
    message: WaMessage;
  };
  /** A message the customer revoked. The row still exists; only its rendering changes. */
  message_deleted?: {
    /** WhatsApp message id (wamid) of the revoked message. */
    messageId: string;
    contactId: string | null;
    conversationId?: string | null;
    sourceIdentifier?: string | null;
    deletedAt: string;
    /** Identifies the message inside the inbox row's last-message preview. */
    waCreatedAt?: string | null;
  };
  /** Who now holds a contact's thread under Meta AI thread control. */
  meta_agent_thread?: {
    contactId: string;
    owner: "AI" | "STAFF";
    /** Meta's handover `metadata`, e.g. `customer_request`. */
    reason: string | null;
    at: string;
  };
}

declare module "fastify" {
  /**
   * Per-route `config` block. Every key here is read by a hook somewhere:
   * `feature`/`fallbackEmptyArray` by utils/permissions.ts, `rawBody` by the
   * Shopify webhook route, `isPublic`/`assertRootOrg` by the linktree,
   * generateQr and surveyTheme route guards.
   */
  interface FastifyContextConfig {
    feature?: import("../../generated/prisma/client.js").TeamFeature;
    /** On a denied feature gate, reply 200 with `[]` instead of 403. */
    fallbackEmptyArray?: boolean;
    rawBody?: boolean;
    isPublic?: boolean;
    assertRootOrg?: boolean;
  }
  interface FastifyRequest {
    userId: string;
    /** Set by the external (/external/v1) prefix hook from the `:orgId` path param. */
    orgId?: string;
    user: {
      // userId/id/email are absent for API-access-token-authenticated requests
      // (see apiAccessToken.auth.ts's verifyApiAccessTokenHook, which only ever
      // sets orgId + role) — every other auth path sets all five fields.
      userId?: string;
      id?: string;
      role: Role;
      orgId: string;
      email?: string;
    };
    subscription: Subscription;
    features: Set<import("../../generated/prisma/client.js").TeamFeature>;
    /** Who is calling and what they may do; set by the authz preHandler. */
    actor?: import("../authz/actor.js").Actor;
    /** Set by the non-session auth paths (API token, Zapier, widget, public flow). */
    principal?: import("../authz/principal.js").Principal;
    loyaltyProgram?: Awaited<
      ReturnType<
        typeof import("../modules/loyalty/program/program.service.js").getLoyaltyProgramByOrg
      >
    >;
  }
}

export interface CustomRouteShortHandOptions extends Omit<RouteShorthandOptions, "config"> {
  config: import("fastify").FastifyContextConfig;
}

export interface CustomRouteShortHandOptionsWithHandler extends Omit<
  RouteShorthandOptionsWithHandler,
  "config"
> {
  config: import("fastify").FastifyContextConfig;
}

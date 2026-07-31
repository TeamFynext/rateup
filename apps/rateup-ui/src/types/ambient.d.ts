// Ambient (global) declarations — types used across the app without an import.
//
// Split out of `global.d.ts`, which mixed these with ~1,100 lines of ordinary module
// exports. Keeping them apart makes it obvious which types are global by design and
// which are just exported from a module that happens to be named `global`.

import type { LoyaltyRewardValue } from "@/backend/loyalty/reward.api";
import type { QuestionFormFeatures } from "@/backend/surveys/questions/questions.types.ts";
import type { SurveyThemePage } from "@/backend/surveyTheme/surveyTheme.types";
// Any modification to this file should be reflected in the backend
import type { UserAvailabilityStatus } from "@/backend/user/user.api";
import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";

import type { RequestPayload } from "./api.ts";
import type {
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

type IssueTicket = {
  minRating?: number;
  minOpinion?: number;
  reqOptions?: Array<string>;
  submissionTicket?: boolean;
  selectedColumnId?: string;
  selectedBoardId?: string;
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

import type {
  FlowLogicJump,
  FlowLogicJumpComponentLevel,
  Testimonial,
  WaAutomationFlowEdge,
  WaAutomationFlowJson,
  WaAutomationFlowNode,
  WaFlowJson,
  WaFlowMap,
  WaFlowStartMessageConfig,
  WebSurveyTheme,
  Wop,
} from "./global";

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    fbq: (...args: unknown[]) => void;
    /** The EyeDropper API, in Chromium browsers only — feature-detected before use. */
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
    /** Razorpay's checkout widget, present once its script has loaded. */
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
  // The analytics snippets are read off `globalThis`, which only picks up
  // global `var` declarations — an `interface Window` member is not enough.
  // Optional because both tags are absent until their script loads (and on SSR).
  var gtag: ((...args: unknown[]) => void) | undefined;
  var fbq: ((...args: unknown[]) => void) | undefined;
  /** The Facebook JS SDK, present once `facebook-jssdk` has loaded. */
  interface FacebookLoginResponse {
    status: "connected" | "not_authorized" | "unknown";
    authResponse?: {
      accessToken: string;
      expiresIn: string;
      signedRequest: string;
      userID: string;
      code: string;
    };
  }
  var FB:
    | {
        init: (options: Record<string, unknown>) => void;
        login: (
          callback: (response: FacebookLoginResponse) => void,
          options?: Record<string, unknown>,
        ) => void;
      }
    | undefined;
  var fbAsyncInit: (() => void) | undefined;
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

  /** One rule in a MultiTextInput question's per-field rule list. */
  interface ValidationFieldRule {
    ruleType: string;
    min?: string;
    max?: string;
    type?: string;
    errorMessage: string;
  }

  /**
   * Plain questions carry named rules (`length`/`wordCount`/`textType`);
   * a MultiTextInput question carries a rule list per field key instead.
   */
  type QuestionValidationRules = ValidationRules | Record<string, ValidationFieldRule[]>;

  interface Question {
    title: Zod.RecordType<string, string>;
    description: Zod.RecordType<string, string>;
    required: boolean;
    type: QuestionType | PageType;
    choices?: Zod.RecordType<string, Array<Choice>>;
    features?: Zod.RecordType<string, QuestionFormFeatures>;
    sections?: Zod.RecordType<string, WaSectionsType>; // only for whatsapp surveys
    label?: Zod.RecordType<string, string>; // only for whatsapp-flow surveys
    id: string;
    metaType?: WaQuestions;
    googleReview?: GoogleReview;
    ticketIssue?: IssueTicket;
    logic?: Array<LogicJump>;
    /** `null` clears the rules. */
    validationRules?: QuestionValidationRules | null;
    tnc?: Record<string, TNC>;
    enableNpsAnalytics?: boolean;
    optinScreenId?: string;
    wop?: Wop;
    onSelectAction?: boolean;
    waAppName?: IntegratedApps;
    subtitleText?: string | null;
    titleText?: string;
    startButtonText?: string;
    extraConfig?: {
      photoSource?: PhotoSource;
      maxFileSizeKB?: number;
      minUploadedPhotos?: number;
      maxUploadedPhotos?: number;
      minUploadedDocuments?: number;
      maxUploadedDocuments?: number;
      allowedMimeTypes?: string[];
    };
    /** `null` clears the review-page config. */
    reviewPageOptions?: {
      minRating?: number;
      minOpinion?: number;
      reqOptions?: string[];
      /** Only set when `reviewPagePlatform` is `Custom`. */
      customPlatformName?: string;
    } | null;
    reviewPagePlatform?: ReviewPagePlatform;
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
  type WaSectionsType = Array<{
    title?: string;
    rows: Array<{ title: string; description: string }>;
  }>;

  interface SurveyVariable {
    id: string;
    name: string;
    value: string;
    type: SurveyVariableType;
    surveyId?: string;
  }

  interface Survey {
    id: string;
    title: string;
    description: string | null;
    questions: Question[];
    languages: string[];
    active: boolean;
    createdBy: string;
    createdAt: string;
    teams: STeam[];
    isProtected: boolean;
    password?: string;
    isPublished: boolean;
    kioskMode: boolean;
    type: SurveyType;
    getLocation: boolean;
    enableTickets: boolean;
    enableTicketEmailAlerts: boolean;
    enableAutoGenerateTicket: boolean;
    enableTicketWaMessageAlerts: boolean;
    uniqueDeviceResponse: boolean;
    welcomePageEnabled: boolean;
    orgLogo?: string;
    surveyTeamMapId?: string;
    /** The Google Sheet responses are synced to, when the integration is connected. */
    spreadSheetId?: string | null;
    skipPreview: boolean;
    publicKey?: string;
    isEncrypted: boolean;
    redirect?: {
      url: string;
      time: string;
    };
    surveyPublishAt?: string;
    surveyEndAt?: string;
    /** Always included by the survey reads; the API dereferences it too. */
    webSurveyTheme: WebSurveyTheme;
    webSurveyThemeId: string;
    /** Defaults to `{}` in the database, so the column is always present. */
    webSurveyPagesTheme: Record<string, SurveyThemePage>;
    /** Review destination per platform. The legacy "" key holds the Google link. */
    reviewPageLinks: Partial<Record<ReviewPagePlatform | "", string>>;
    /** Recipient for survey response notification emails. */
    notificationEmail?: string;
    /** Whether response notification emails are sent at all. */
    enableNotificationEmail?: boolean;
    /** Per-language overrides for the renderer's built-in UI strings. */
    uiTextTranslations?: Record<string, Record<string, string>>;
    /** Cached AI summaries of the survey's long-text answers. */
    aiResponseSummary?: ResponseSummary[];
    /** Advance to the next question automatically once an answer is picked. */
    webSurveyAutoTransitionToNextQues?: boolean;
    /** Email a weekly summary of responses. */
    sendWeeklyReport?: boolean;
    /** Endpoint each new response is POSTed to. */
    responseWebhookEndpoint?: string;
    ticketColumnId?: string;
    ticketBoardId?: string;
    /** Owning organisation's name, included by the public survey endpoint. */
    orgName?: string;
    /** Welcome page theme, included by the survey templates endpoint. */
    WelcomeTheme?: { bgType?: string; bgStyles?: React.CSSProperties };
  }

  interface STeam {
    id: string;
    name: string;
    surveyStats?: STStats;
    tags: Array<string>;
    mapId: string;
    code: string;
    shortUrlId?: string;
    responsesCount?: { responses?: number };
  }

  interface STStats {
    id: string;
    surveyTeamMapId: string;
    visited: number;
    started: number;
    completed: number;
  }

  interface SurveySummary {
    id: string;
    title: string;
    active: boolean;
    createdAt: string;
    type: string;
    isPublished: true;
    teams: {
      id: string;
      mapId: string;
      teamName: string;
      responses: {
        id: string;
        createdAt: string;
      }[];
      surveyStats: {
        visited: number;
        started: number;
        completed: number;
      };
      name: string;
    }[];
    WaFlow?: {
      dbFlowId?: string;
      version?: number;
    };
    responseCount?: number;
  }

  interface dataError {
    error: string;
  }
  interface SurveySummaryData {
    totalTeamsCount: number;
    totalSurveysCount: number;
    activeSurveysCount: number;
    surveys: SurveySummary[];
  }

  interface SurveyLanding {
    id: string;
    title: string;
    description: string | null;

    surveys: string[];
    createdBy: string;
    createdAt: string;
    type: string;
  }

  interface SurveyResponse {
    id: string;
    createdAt: string;
    surveyTeamMapId: string;
    encryptedResponses?: string;
    responses?: Array<QuestionResponse>;
    encryptedResponses?: string;
    language: string;
    tag: string | null;
    location?: {
      coordinates?: Coordinates;
      city?: string;
      state?: string;
      country?: string;
    };
    Ticket?: {
      id: string;
    };
    teamId?: string;
  }
  interface Coordinates {
    latitude: number;
    longitude: number;
  }
  interface ChoiceWithPicture {
    value: string | { image: string; value: string };
    weightage?: NPSWeightage;
  }
  interface Choice {
    value:
      | string
      | {
          image?: string;
          title: string;
          description?: string;
          metadata?: string;
        };
    weightage?: NPSWeightage;
  }
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
      [QuestionType.Phone]?: {
        name?: string;
        phone: string;
        email?: string;
      };
      [QuestionType.Photo]?: string;
      [QuestionType.Date]?: Date;
      [QuestionType.CustomNPS]?: Choice;
      [QuestionType.TnC]?: boolean;
      [QuestionType.WaList]?: { title: string; description?: string };
    };
  }

  interface EncryptionKeys {
    publicKey: string;
    privateKey: string;
  }

  interface UserData {
    orgId: string;
    role: string;
    userId: string;
    userName: string;
    email: string;
    phone?: string;
    profilePhoto: string;
    orgName: string;
    orgLogo: string;
    orgPhone: string;
    orgAddress: string;
    teams: Array<string>;
    encryptionKeys: EncryptionKeys | undefined;
    createdAt?: Date;
    recipeName?: string;
    active?: boolean;
    isPaused?: boolean;
    pausedBy?: string;
    isOrgPaused?: boolean;
    waAssignedChatPermission: WaAssignedChatPermission;
    status: UserAvailabilityStatus;
    hasWhatsAppSettings: boolean;
    onboardingCompleted?: boolean;
    presenceMode: UserPresenceMode;
    showLifecycle: boolean;
    isConversionApiActive: boolean;
    onboardingChecklistCompleted: boolean;
  }

  interface UserInfoQueryData {
    data: {
      data: UserData;
    };
  }

  // for org members

  export interface MembersResponse {
    message: string;
    data: TeamMembersData[];
  }

  interface Team {
    team_id: string;
    team_name: string;
    team_code: string;
  }
  export interface TeamMembersData {
    id: string;
    email: string;
    name: string;
    role: string;
    teams: Team[];
    isPaused?: boolean;
    status: "online" | "offline";
  }

  export interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
  }

  interface UseMembersResult {
    isLoading: boolean;
    data: MembersResponse;
    refetch: () => void;
    error: Error | null;
  }

  // for individual teams

  interface TeamData {
    id: string;
    name: string;
    code: string;
    color: string;
    createdAt: string;
    _count: {
      members: number;
    };
    googleLink?: string | null;
    /** Review destination per platform, when the team row is joined with them. */
    reviewPageLinks?: Record<string, string>;
  }

  interface TeamsResponse {
    message: string;
    data: TeamData[];
  }

  interface UseTeamsByUserResult {
    isLoading: boolean;
    error: Error | null;
    data: TeamsResponse;
    refetch: () => void;
    isError?: boolean;
  }

  // for individual team
  interface member {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "MEMBER" | "SUPER_ADMIN";
    userId: string;
    active: boolean;
    phone: string;
    createdAt: string;
  }
  interface ITeamResponseData {
    teamId: string;
    teamName: string;
    code: string;
    googleLink?: string | null;
    tags: Array<string>;
    invitations: Array<{
      id: string;
      name: string;
      email: string;
      status: string;
      type: "TEAM";
      invitedBy: string;
    }>;
    members: Array<member>;
  }

  interface UseTeamResult {
    isLoading: boolean;
    data: ITeamResponseData;
    refetch: () => void;
  }

  interface LogicJump {
    condition: LogicCondition;
    response: string | string[]; // for (MSQ and DDMS) or (for conditions like includeAnyOf) it will be an array of indices of selected choices
    action: LogicAction;
  }

  interface WaCustomer {
    id: string;
    createdAt: Date;
    name: string | null;
    phone: string;
    email: string | null;
    teamId: string | null;
  }

  interface WaCustomerGroup {
    id: string;
    createdAt: Date;
    name: string;
    teamId: string;
  }

  // for contacts
  interface ContactsData {
    id: string;
    name: string;
    phone: string;
    other?: string;
    email: string;
    dob?: Date;
    source: string;
    createdAt: Date;
    tags?: string[];
    consent: boolean;
    lifecycleName: string;
    lifecycleId: string;
    waMessageAssignStatus: WaMessageAssignStatus;
    whatsappUserName?: string;
    blockedOnWhatsApp: boolean;
    igsId: string;
    psid: string;
    isIgVerifiedUser: boolean;
    followerCount: number;
    profilePic: string;
    lastReceivedMessageTimeStamp: string;
    closedAt: string | null;
    closedUser: {
      id: string;
      name: string;
    } | null;
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
    contactGroups?: Array<{ contactGroup?: ContactGroup }>;
    campaignParticipants: Array<{ id?: string; campaignId?: string }>;
    aiWaChat: boolean;
    /** Labels attached to the contact, as the contacts table renders them. */
    ContactLabelMap?: Array<{
      label?: {
        id?: string;
        name?: string;
        color?: string;
      };
    }>;
    /** Present when the row is joined with its lifecycle stage. */
    Lifecycle?: {
      name?: string;
    };
    /** Free-text notes shown on the contact detail panel. */
    notes?: string;
    location?: string;
    /**
     * The label relation as the detail endpoints spell it (the list endpoint
     * returns the same data under `ContactLabelMap`).
     */
    contactLabelMap?: Array<{
      label?: {
        id?: string;
        name?: string;
        color?: string;
      };
    }>;
    /** Groups the contact belongs to, when the row is joined with them. */
    contactGroups?: Array<{ contactGroup?: ContactGroup }>;
    customFields?: Array<{
      /** Only a saved row carries the join columns; a form value has just the field and value. */
      id?: string;
      contactId?: string;
      fieldId: string;
      value: string;
      createdAt?: string;
    }>;
    waInboxAssign: Array<{
      assignedUser: {
        name: string;
        id: string;
      };
    }>;
  }

  interface ContactsResponse {
    message: string;
    data: ContactsData[];
  }

  interface ContactGroup {
    id: string;
    name: string;
    teamId: string;
    icon: string;
    createdAt: string;
    type: string;
    /** `ContactGroup.tags` is a JSON column: tag selections keyed by contact type. */
    tags: Record<string, unknown>;
    contactType: string[];
    team: {
      name: string;
    };
    _count: {
      contacts: number;
      LoyaltyCustomerMap: number;
    };
  }
  interface ContactGroupResponse {
    message: string;
    data: ContactGroup[];
  }

  interface ContactGroupwithContacts extends ContactGroup {
    contacts: ContactsData[];
    team?: {
      id?: string;
      name?: string;
    };
    totalCount?: number;
    loyaltyCustomers?: LoyaltyCustomerTable[];
  }
  interface ReviewsFilter {
    sentiment: {
      [key in SentimentClass]: boolean;
    };
    rating: {
      [key: number]: boolean;
    };
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
  /**
   * One node of the feature tree: an `active` flag, an optional bag of numeric limits,
   * and any number of nested sub-features. The admin plan editor walks the tree by key,
   * so `SubscriptionFeatures` carries this as its index signature alongside the named
   * features the rest of the app reads directly.
   */
  interface SubscriptionFeatureNode {
    active?: boolean;
    count?: Record<string, number>;
    [subFeature: string]: SubscriptionFeatureNode | Record<string, number> | boolean | undefined;
  }
  interface SubscriptionFeatures {
    // [subscriptionFeatureName] : {subfeatures & activeField & countRestriction}
    [feature: string]: SubscriptionFeatureNode;
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
      /** Monthly send allowance, as the plans endpoint reports it. */
      count?: { monthlyMessageLimit?: number };
      automation?: subscriptionActiveField & {
        automationTrigger?: subscriptionCountRestriction;
      };
      campaign?: subscriptionActiveField & subscriptionCountRestriction;
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
    // Loyalty is provisioned per plan and absent on older stored subscriptions.
    loyalty?: subscriptionActiveField & {
      action: subscriptionCountRestriction;
      reward: subscriptionCountRestriction;
      customer: subscriptionCountRestriction;
    };
  }
  interface SPlan {
    id: string;
    name: string;
    displayName: string;
    paymentPlan?: {
      period: string;
      /** A number for real plans; the enterprise tiers use "Lets Talk!". */
      amount: number | string;
      currency?: string;
    };
    paymentPlanId?: string;
    /** Present when the plan is billed through Stripe rather than Razorpay. */
    stripeProduct?: StripeProduct;
  }

  interface StripeProduct {
    id: string;
    productId: string;
    name: string;
    description?: string;
    createdAt: number;
    active: boolean;
    liveMode: boolean;
    priceId: string;
    currency: string;
    amount: number;
    interval: string;
    intervalCount: number;
    type: StripeProductType;
    status: PaymentPlanStatus;
  }
  interface StripeSubscription {
    id: string;
    productName: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: number;
    startsAt: number;
    endsAt: number;
  }
  interface Subscription {
    orgId: string;
    /** Included when the admin endpoints expand the owning org. */
    org?: { id: string; name: string };
    features: SubscriptionFeatures;
    expiresAt: Date;
    renewedAt?: Date;
    createdAt: Date;
    basePlan: SPlan;
    id?: string;
    paymentPlanId?: string;
    subscriptionRef?: string;
    isAnnualMessageLimit: boolean;
    shopifyPlanId?: string;
  }
  interface Org {
    id: string;
    createdAt: Date;
    name: string;
    ownerId: string;
    logo: string;
    phone: string;
    address: string;
    isPaused?: boolean;
    deletionMailSent: string;
  }
  interface WaFlowTemplateMessage {
    header?: string;
    headerImage?: string;
    body: string;
    footer?: string;
    cta: string;
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

  interface DbFlow {
    dbFlowId: string;
    createdAt: Date;
    flowId: string;
    name: string;
    status: WaFlowStatus;
    json: WaFlowJson;
    map: WaFlowMap;
    logicJumps: {
      [screenId: string]: Array<FlowLogicJump | FlowLogicJumpComponentLevel>;
    };
    orgId: string;
    surveyId: string;
    templateMessage: WaFlowTemplateMessage;
    /** The list endpoint selects only the survey's team ids. */
    survey?: {
      teams?: Array<{
        teamId: string;
        /** Not selected by the flow list endpoint; present on richer survey reads. */
        surveyStats?: STStats;
      }>;
    };
    startMessageConfig: WaFlowStartMessageConfig;
    pendingSave: boolean;
    anonymous: boolean;
    version: number;
    ticketIssued: FlowTicket[];
  }

  interface LoyaltyCustomer {
    id: string;
    createdAt: Date;
    name: string | null;
    phone: string;
    email: string | null;
    dob?: Date | null;
    points: number;
    orgId: string;
  }
  //  for customer table
  interface LoyaltyAction {
    name: string;
    points: number;
    amount?: number;
    amountSpent?: number;
    createdAt: Date;
  }

  interface LoyaltyRedeem {
    reward: {
      name: string;
      points: number;
    };
    createdAt: Date;
  }

  interface LoyaltyReward {
    id: string;
    name: string;
    points: number;
    description: string;
    tnc: string;
    maxPerUser: number;
    expireAt: Date;
    createdAt: Date;
    waTemplateId: string;
    rewardType:
      | "discount_fixed"
      | "discount_percentage"
      | "free_item"
      | "point"
      | "coupon"
      | "assigned";
    rewardValue: LoyaltyRewardValue;
  }

  interface LoyaltyCustomerTable {
    id: string;
    // customerInfo: {
    name: string;
    phone: string;
    createdAt: Date;
    // };
    referralCodes: string[];
    [LoyaltyActionType.ReferFriend]: LoyaltyAction[];
    [LoyaltyActionType.DirectPurchase]: LoyaltyAction[];
    [LoyaltyActionType.ReferralPurchase]: LoyaltyAction[];
    totalPoints: number;
    balancePoints: number;
    redeems: LoyaltyRedeem[];
    action: LoyaltyAction[];
  }

  interface LoyaltyApiSetting {
    id: string;
    orgId: string;
    feature: LoyaltyApiFeature;
    rules: {
      fields: { key: string; value: string }[];
    };
    action?: LoyaltyAction;
    reward?: LoyaltyReward;
    phoneKey: string;
    amountKey: string;
    actionId?: string;
    rewardId?: string;
    priority: number;
    active: boolean;
  }
}

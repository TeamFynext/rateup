import type { LoyaltyRewardValue } from "@/backend/loyalty/reward.api";
// Any modification to this file should be reflected in the backend
import type { UserAvailabilityStatus } from "@/backend/user/user.api";
import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";
import type { QuestionFormFeatures } from "@/components/Survey/Question/QuestionExtraProps/questionForm";
import type { SurveyThemePage } from "@/components/Survey/SurveyTheme/surveyThemeReducer";

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
  WaTemplateComponentTypeUpperCase,
  WaTemplateStatus,
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

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    fbq: (...args: unknown[]) => void;
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
      id: string;
      contactId: string;
      fieldId: string;
      value: string;
      createdAt: string;
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
            attachments?: [
              // Included when a customer sends multiple media attachments or a URL for a story mention or share
              {
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
  send?: WaSendMessageBody | IgSendMessageBody;
  receive?: WaReceiveMessageBody | IgReceiveMessageBody;
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

interface WaTemplateLanguage {
  code: string;
}

export interface WaTemplateComponent {
  type: WaTemplateComponentType;
  sub_type?: "quick_reply" | "list_reply" | "button_reply" | "nfm_reply";
  index?: number;
  parameters: WaTemplateParameter[];
}

interface WaTemplateParameter {
  type: WaTemplateSupportedParameters;
  text?: string;
  currency?: Currency;
  date_time?: DateTime;
  payload?: string;
  location?: Location;
  image?: Image;
  video?: Video;
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
  /** Drip campaigns only: the ordered stages and their templates. */
  dripStages?: CampaignDripStage[];
  /** The flow a flow campaign sends, when its template carries a flow button. */
  flowId?: string | null;
  /** Template variables mapped to contact fields. */
  dynamicTags?: string[];
  /** Whether the send respects each contact's marketing consent. */
  useUserConsent?: boolean;
  /** Set by the survey share flow when the campaign targets one survey/team pair. */
  surveyTeamMapId?: string;
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

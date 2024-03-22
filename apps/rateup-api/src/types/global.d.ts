// Any modification to this file should be reflected in the frontend
import { Prisma, Role } from "@prisma/client";
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
} from "./enums";
import { PipeSourceManagedStreamingKafkaParameters } from "aws-sdk/clients/pipes";
import { getSession } from "../modules/whatsapp/whatsappSurvey/wasurvey.service";
import prisma from "../utils/prisma";
import { WaReceiveMessageBody, WaSendMessageBody } from "./whatsapp.types";

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

type TNC = {
  title: string;
  urlTitle: string;
  content: string;
};

type ValidationRules = {
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
};

export {};
declare global {
  type Choice = {
    value: string;
    weightage?: NPSWeightage;
  };
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
    validationRules?: ValidationRules;
    tnc?: TNC;
  }
  type WaSectionsType = Array<{
    title?: string;
    rows: Array<{ id?: string; title: string; description?: string }>;
  }>;
  // This is NOT SurveyResponse. This indicates the response to a single question.
  // SurveyResponse.responses is an array of these.
  type QuestionResponse = {
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
      [QuestionType.Address]?: {
        address1: string;
        address2?: string;
        city: string;
        postalCode: string;
        country: string;
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
    };
  };
  type LogicJump = {
    condition: LogicCondition;
    response: string | string[]; // for (MSQ and DDMS) or (for conditions like includeAnyOf) it will be an array of indices of selected choices
    action: LogicAction;
  };
  type WaTemplateWithTypes = {
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
  };
  type WaSessionWithRelations = Awaited<ReturnType<typeof getSession>>;

  type subscriptionCountRestrictionCountType = {
    max: number;
  };
  type subscriptionCountRestriction = {
    count: subscriptionCountRestrictionCountType;
  };
  type subscriptionActiveField = {
    active: boolean;
  };
  interface SubscriptionFeatures {
    // [subscriptionFeatureName] : {subfeatures & activeField & countRestriction}
    [sfpn.Menu]: subscriptionCountRestriction & subscriptionActiveField;
    [sfpn.Team]: {
      teamMember: subscriptionCountRestriction & subscriptionActiveField;
    } & subscriptionActiveField &
      subscriptionCountRestriction;
    [sfpn.WebSurvey]: subscriptionActiveField & subscriptionCountRestriction;
    [sfpn.WhatsAppSurvey]: subscriptionActiveField &
      subscriptionCountRestriction;
    [sfpn.WhatsAppCampaign]: subscriptionActiveField &
      subscriptionCountRestriction;
    [sfpn.ReputationManagement]: subscriptionActiveField &
      subscriptionCountRestriction;
    [sfpn.Ticket]: subscriptionActiveField & subscriptionCountRestriction;
  }

  interface SPlan {
    id: string;
    name: string;
  }

  interface Subscription {
    orgId: string;
    features: SubscriptionFeatures;
    expiresAt: Date;
    renewedAt?: Date;
    createdAt: Date;
    basePlan: SPlan;
  }
  type WaFlowWa = {
    // wa flow type from whatsapp
    name: string;
    id: string;
    status: WaFlowStatus;
    categories?: string[];
  };
  type WaFlowJson = {
    version: string;
    screens: Array<WaFlowScreen>;
  };
  type WaFlowScreen = {
    id: string;
    title: string;
    layout: WaFlowLayout;
    data: any; // add types
    terminal: boolean;
  };

  type WaFlowLayout = {
    type: WaFlowLayoutType;
    children: Array<WaFlowForm>;
  };

  type WaFlowForm = {
    type: string; // add types
    name: string;
    children: Array<WaFlowFormElement>;
  };

  type WaFlowFormElement = {
    id: string; // for internal use only. Should be removed before sending to whatsapp server
    type: WaFlowFormElementType;
    text?: string;
    label?: string;
    name?: string;
    required?: boolean;
    "input-type"?: string; // add types
    "on-click-action"?: WaFlowOnClickAction;
    "data-source"?: Array<WaFlowFormChoice>;
  };

  type WaFlowFormChoice = {
    id: string;
    title: string;
  };

  type WaFlowOnClickAction = {
    name: string; // add types
    next?: {
      type: string; // add types
      name: string;
    };
    payload: any;
  };
  type WaFlowPreview = { preview_url: string; expires_at: string };
  type WaFlowTemplateMessage = {
    header?: string;
    headerImage?: string;
    body: string;
    footer?: string;
    cta: string;
  };
  type WaAutomatedReplyMatchData = {
    keywords?: Array<string>;
    exactText?: string;
    caseSensitive: boolean;
  };
  type WaInboxMessageBody = {
    exchangeProcess: "send" | "receive";
    send?: WaSendMessageBody;
    receive?: WaReceiveMessageBody;
  };
  // PRISMA JSON TYPES
  namespace PrismaJson {
    type PWaFlowJson = WaFlowJson;
    type PWaFlowPreview = WaFlowPreview;
    type PWaFlowTemplateMessage = WaFlowTemplateMessage;

    type PQuestion = Question;
    type PQuestionResponse = QuestionResponse;
    type PWaAutomatedReplyMatchData = WaAutomatedReplyMatchData;

    type PWaMessageBody = WaInboxMessageBody;
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
declare module "fastify" {
  interface FastifyRequest {
    userId: string;
    user: {
      userId: string;
      role: Role;
      orgId: string;
      email: string;
    };
    subscription: Subscription;
  }
}

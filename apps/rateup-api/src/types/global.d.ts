// Any modification to this file should be reflected in the frontend
import { Prisma, Role, Subscription } from "@prisma/client";
import { QuestionType, SmileyResponse, YNResponse, LDResponse, LogicAction, LogicCondition, WaTemplateStatus, NPSWeightage } from "./enums";
import { PipeSourceManagedStreamingKafkaParameters } from "aws-sdk/clients/pipes";
import { toBeIncludedWaSessionRelations } from "../modules/whatsapp/whatsappSurvey/wasurvey.service";

type GoogleReview = {
  minRating?: number;
  minOpinion?: number;
  reqOptions?: Array<string>;
} | null;

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
  } | null
};

export { };
declare global {
  type Choice = {
    value: string;
    weightage?: NPSWeightage;
  }
  type Question = {
    title: Zod.RecordType<string, string>;
    description: Zod.RecordType<string, string>;
    required: boolean;
    type: QuestionType;
    choices?: Zod.RecordType<string, Array<Choice>>;
    features?: Zod.RecordType<string, Zod.RecordType<string, boolean>>;
    id: string;
    googleReview?: GoogleReview
    logic?: Array<LogicJump>
    validationRules?: ValidationRules
    sections?: Zod.RecordType<string, WaSectionsType>; // for Wa_List
  };
  type WaSectionsType = Array<{
    title?: string;
    rows: Array<{ id?: string, title: string; description?: string }>;
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
      [QuestionType.Email]?: string;
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
      [QuestionType.Phone]?: string;
      [QuestionType.Photo]?: string;
      [QuestionType.DateTime]?: Date;
      [QuestionType.WaList]?: { title: string, description?: string };
    };
  };
  type LogicJump = {
    condition: LogicCondition;
    response: string | string[]; // for (MSQ and DDMS) or (for conditions like includeAnyOf) it will be an array of indices of selected choices
    action: LogicAction;
  };
  type WaTemplateWithTypes = {
    id: string
    createdAt: Date
    data: {
      name: string
      components: Array<any>
      id: string
      status: WaTemplateStatus
      language: string
    }
    acceptButton: string
    orgId: string
  }
  type WaSessionWithRelations = Omit<Prisma.WaSessionGetPayload<typeof fullWaSession>, "responses"> & { responses: Array<QuestionResponse> } // overriding JSON type
}

const fullWaSession = Prisma.validator<Prisma.WaSessionArgs>()({
  include: toBeIncludedWaSessionRelations
})
declare module 'fastify' {
  interface FastifyRequest {
    userId: string,
    user: {
      userId: string,
      role: Role,
      orgId: string,
      email: string,
    },
    subscription: Subscription
  }
}
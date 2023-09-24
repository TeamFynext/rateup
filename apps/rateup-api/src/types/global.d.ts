// Any modification to this file should be reflected in the frontend
import { QuestionType, SmileyResponse, YNResponse, LDResponse, LogicAction, LogicCondition, WaTemplateStatus } from "./enums";

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
  type Question = {
    title: Zod.RecordType<string, string>;
    description: Zod.RecordType<string, string>;
    required: boolean;
    type: QuestionType;
    choices?: Zod.RecordType<string, Array<string>>;
    id: string;
    googleReview?: GoogleReview
    logic?: Array<LogicJump>
    validationRules?: ValidationRules
  };
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
      };
      [QuestionType.LD]?: LDResponse;
      [QuestionType.YN]?: YNResponse;
      [QuestionType.Rating]?: number;
      [QuestionType.Smiley]?: SmileyResponse;
      [QuestionType.Opinion]?: number;
      [QuestionType.MCQ]?: string;
      [QuestionType.MSQ]?: Array<string>;
      [QuestionType.DDSS]?: string;
      [QuestionType.DDMS]?: Array<string>;
      [QuestionType.Phone]?: string;
      [QuestionType.Photo]?: string;
      [QuestionType.DateTime]?: Date;
    };
  };
  type LogicJump = {
    condition: LogicCondition;
    response: any
    action: LogicAction;
  }
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
    teamId: string
  }
}

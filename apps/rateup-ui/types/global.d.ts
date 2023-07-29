// Any modification to this file should be reflected in the backend
import { QuestionType } from "./enums";
export {};
declare global {
  type Question = {
    title: Zod.RecordType<string, string>;
    description: Zod.RecordType<string, string>;
    required: boolean;
    type: QuestionType;
    choices?: Zod.RecordType<string, Array<string>>;
    id: string;
    logic?: Zod.RecordType<string|number|Array<string>, string>
  };

  type Survey = {
    id: string;
    title: string;
    description: string | null;
    questions: Question[];
    languages: string[];
    active: boolean;
    createdBy: string;
    createdAt: string;
    teamId: string;
    isProtected:boolean
    type:string
  };

  type SurveyResponse = {
    id: string;
    createdAt: Date;
    surveyId: string;
    responses: Array<QuestionResponse>;
    language: string;
  };
  
  type QuestionResponse = {
    questionId: string;
    type: QuestionType;
    response: {
      [QuestionType.Text]?: string;
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
      [QuestionType.Phone]?: string;
      [QuestionType.Photo]?: string;
      [QuestionType.DateTime]?: Date;
    };
  };

    type UserData = {
        email: string,
        userId: string,
        role: string
        orgId: string
        profilePhoto: string
  }

  interface UserInfoQueryData {
    data: {
        data: UserData
    };
  
  }
}

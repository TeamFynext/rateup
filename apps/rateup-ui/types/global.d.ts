// Any modification to this file should be reflected in the backend
import { QuestionType, MenuItemPriceType } from "./enums";

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
  } | null;
};

export {};
declare global {
  type Question = {
    title: Zod.RecordType<string, string>;
    description: Zod.RecordType<string, string>;
    required: boolean;
    type: QuestionType;
    choices?: Zod.RecordType<string, Array<string>>;
    sections?: Zod.RecordType<string, WaSectionsType>;
    id: string;
    googleReview?: GoogleReview;
    logic?: Array<LogicJump>;
    validationRules?: ValidationRules;
  };
  type WaSectionsType = Array<{
    title?: string;
    rows: Array<{ title: string; description: string }>;
  }>;

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
    isProtected: boolean;
    kioskMode: boolean;
    type: string;
    getLocation: boolean;
    welcomePageEnabled: boolean;
  };

  interface SurveySummary {
    id: string;
    title: string;
    active: boolean;
    createdAt: string;
    type: string;
    responses: {
      id: string;
      createdAt: string;
    }[];
    surveyStats: {
      id: string;
      surveyId: string;
      visited: number;
      started: number;
      completed: number;
    };
    team: {
      name: string;
    };
  }

  interface SurveySummaryData {
    totalTeamsCount: number;
    totalSurveysCount: number;
    activeSurveysCount: number;
    surveys: SurveySummary[];
  }

  type SurveyLanding = {
    id: string;
    title: string;
    description: string | null;

    surveys: string[];
    createdBy: string;
    createdAt: string;
    type: string;
  };

  type SurveyResponse = {
    id: string;
    createdAt: string;
    surveyId: string;
    responses: Array<QuestionResponse>;
    language: string;
    location?: {
      coordinates?: {
        latitude: number;
        longitude: number;
      };
      city?: string;
      state?: string;
      country?: string;
    };
  };

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
      [QuestionType.WaList]?: { title: string; description?: string };
    };
  };

  type UserData = {
    orgId: string;
    role: string;
    userId: string;
    userName: string;
    email: string;
    profilePhoto: string;
    orgName: string;
    orgLogo: string;
    orgPhone: string;
    orgAddress: string;
  };

  interface UserInfoQueryData {
    data: {
      data: UserData;
    };
  }

  type LogicJump = {
    condition: LogicCondition;
    response: any; // Contains the response to match against
    action: LogicAction;
  };

  type Menu = {
    id: string;
    createdAt: string;
    name: string;
    displayName: string;
    locationUrl?: string;
    locationText?: string;
    websiteUrl?: string;
    websiteText?: string;
    teamId: string;
    logo?: string;
  };

  type MenuCategory = {
    id: string;
    createdAt: string;
    name: string;
    menuId: string;
    image: string;
  };

  type MenuItem = {
    id: string;
    createdAt: string;
    name: string;
    description: string;
    images: string[];
    videoUrl: string | null;
    price: {
      type: MenuItemPriceType;
      price?: number;
      variants?: Array<{
        price: number;
        name: string;
      }>;
    };
    categoryId: string;
  };
  interface FullCategory extends MenuCategory {
    items: MenuItem[];
  }
  interface FullMenu extends Menu {
    categories: FullCategory[];
  }

  type WaCustomer = {
    id: string;
    createdAt: Date;
    name: string | null;
    phone: string;
    email: string | null;
    teamId: string | null;
  };

  type WaCustomerGroup = {
    id: string;
    createdAt: Date;
    name: string;
    teamId: string;
  };
}

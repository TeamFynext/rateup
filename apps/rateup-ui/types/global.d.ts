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
    teams: STeam[];
    isProtected: boolean;
    isPublished: boolean;
    kioskMode: boolean;
    type: string;
    getLocation: boolean;
    welcomePageEnabled: boolean;
    orgLogo?: string;
    surveyTeamMapId?: string;
    skipPreview: boolean;
  };

  interface STeam {
    id: string;
    name: string;
    mapId: string;
  }

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

  type dataError = {
    error: string;
  };
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
    surveyTeamMapId: string;
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

  //for org members

  export interface MembersResponse {
    message: string;
    data: TeamMembersData[];
  }

  type Team = {
    team_id: string;
    team_name: string;
    team_code: string;
  };
  export interface TeamMembersData {
    id: string;
    email: string;
    name: string;
    role: string;
    teams: Team[];
  }

  export interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
  }

  type UseMembersResult = {
    isLoading: boolean;
    data: MembersResponse;
    refetch: () => void;
    error: any;
  };

  //for individual teams

  type TeamData = {
    id: string;
    name: string;
    code: string;
    _count: {
      members: number;
    };
    googleLink?: string | null;
  };

  type TeamsResponse = {
    message: string;
    data: TeamData[];
  };

  type UseTeamsByUserResult = {
    isLoading: boolean;
    error: any;
    data: TeamsResponse;
    refetch: () => void;
    isError?: any;
  };

  //for individual team
  type member = {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "MEMBER" | "SUPER_ADMIN";
    userId: string;
    active: boolean;
  };
  interface ITeamResponseData {
    teamId: string;
    teamName: string;
    code: string;
    googleLink?: string | null;
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

  type UseTeamResult = {
    isLoading: boolean;
    data: ITeamResponseData;
    refetch: () => void;
  };

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
    backgroundImage?: string;
    isPublished?: boolean;
  };

  type MenuCategory = {
    id: string;
    createdAt: string;
    name: string;
    menuId: string;
    image: string;
    itemOrder?: number;
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
    itemOrder?: number;
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

  // for contacts
  type ContactsData = {
    id: string;
    teamId: string;
    name: string;
    phone: string;
    email: number;
    createdAt: Date;
  };

  type ContactsResponse = {
    message: string;
    data: ContactsData[];
  };

  type ContactGroup = {
    id: string;
    name: string;
    teamId: string;
    icon: string;
  };
  type ContactGroupResponse = {
    message: string;
    data: ContactGroup[];
  };

  interface ContactGroupwithContacts extends ContactGroup {
    contacts: ContactsData[];
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
  landingData: boolean;
  surveyId: string;
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

export type ReviewSuggestion = {
  id: string;
  teamId: string;
  review: string;
};

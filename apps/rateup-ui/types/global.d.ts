// Any modification to this file should be reflected in the backend
import {
  QuestionType,
  MenuItemPriceType,
  NPSWeightage,
  LogicCondition,
  LogicAction,
  WaFlowLayoutType,
  WaFlowFormElementType,
  WaFlowStatus,
  SurveyType,
} from "./enums";

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
    choices?: Zod.RecordType<string, Array<Choice>>;
    features?: Zod.RecordType<string, Zod.RecordType<string, any>>;
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
    type: SurveyType;
    getLocation: boolean;
    welcomePageEnabled: boolean;
    orgLogo?: string;
    surveyTeamMapId?: string;
    skipPreview: boolean;
  };

  interface STeam {
    id: string;
    name: string;
    surveyStats?: STStats;
    tags: Array<string>;
    mapId: string;
    code: string;
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
    tag: string;
    location?: {
      coordinates?: Coordinates;
      city?: string;
      state?: string;
      country?: string;
    };
  };
  type Coordinates = {
    latitude: number;
    longitude: number;
  };
  type ChoiceWithPicture = {
    value: string | { image: string; value: string };
    weightage?: NPSWeightage;
  };
  type Choice = {
    value: string;
    weightage?: NPSWeightage;
  };
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
      [QuestionType.DateTime]?: Date;
      [QuestionType.CustomNPS]?: Choice;
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
    teams: Array<string>;
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

  type UseTeamResult = {
    isLoading: boolean;
    data: ITeamResponseData;
    refetch: () => void;
  };

  type LogicJump = {
    condition: LogicCondition;
    response: string | string[]; // for (MSQ and DDMS) or (for conditions like includeAnyOf) it will be an array of indices of selected choices
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
    team?: {
      code?: string;
    };
  };

  type MenuCategory = {
    id: string;
    createdAt: string;
    name: string;
    menuId: string;
    image: string;
    itemOrder?: number;
    scheduleEnabled?: boolean;
    startTime?: string;
    endTime?: string;
  };

  type MenuItem = {
    id: string;
    createdAt: string;
    name: string;
    description: string;
    images: Array<string | File>;
    videoUrl: string | null;
    price: {
      type: MenuItemPriceType;
      price?: number | string;
      variants?: Array<{
        price: number | string;
        name: string;
      }>;
    };
    categoryId: string;
    itemOrder?: number;
    disabled?: boolean;
    foodLabels?: Array<string>;
  };

  type MenuBanner = {
    id: string;
    createdAt: string;
    name: string;
    description: string;
    image?: string;
    videoUrl: string | null;
    price: {
      type: MenuItemPriceType;
      price?: string;
      variants?: Array<{
        price: string;
        name: string;
      }>;
    };
    menuId: string;
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
    email: string;
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
  interface RM_Topic {
    id: string;
    name: string;
    keywords: string[];
    teamId: string;
  }
  interface ReviewsFilter {
    sentiment: {
      [key in SentimentClass]: boolean;
    };
    rating: {
      [key: number]: boolean;
    };
  }
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
    id?: string;
    paymentPlanId?: string;
  }
  type Org = {
    id: string;
    createdAt: Date;
    name: string;
    ownerId: string;
    logo: string;
    phone: string;
    address: string;
  };
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
  };
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

export type WaFlow = {
  name: string;
  id: string;
  status: WaFlowStatus;
  json: WaFlowJson;
};
export type WaFlowJson = {
  version: string;
  screens: Array<WaFlowScreen>;
};
export type WaFlowScreen = {
  id: string;
  title: string;
  layout: WaFlowLayout;
  data: any; // add types
  terminal: boolean;
};

export type WaFlowLayout = {
  type: WaFlowLayoutType;
  children: Array<WaFlowForm>;
};

export type WaFlowForm = {
  type: string; // add types
  name: string;
  children: Array<WaFlowFormElement>;
};

export type WaFlowFormElement = {
  type: WaFlowFormElementType;
  text?: string;
  label?: string;
  name?: string;
  required?: boolean;
  "input-type"?: string; // add types
  "on-click-action": WaFlowOnClickAction;
  "data-source": Array<WaFlowFormChoice>;
};

export type WaFlowFormChoice = {
  id: string;
  title: string;
};

export type WaFlowOnClickAction = {
  name: string; // add types
  next?: {
    type: string; // add types
    name: string;
  };
  payload: any;
};

/** One bar in a question's choice breakdown. */
export type ChoiceWiseDatum = {
  choice: string;
  count: number;
  /** `getPercentage` yields the string "0" when there are no responses. */
  percentage?: number | string;
};

export type ChoiceWiseEntry = {
  responseCount?: number;
  data: ChoiceWiseDatum[];
};

export type NpsEntry = {
  npsData?: {
    npsScore?: number;
    promoters?: number;
    passives?: number;
    detractors?: number;
  };
};

/** Response of `GET /api/response/analytics/:surveyId`, both maps keyed by question id. */
export type SurveyResponseAnalytics = {
  nps: Record<string, NpsEntry>;
  choiceWise: Record<string, ChoiceWiseEntry>;
};

/** One answer inside a respondent's submission. */
export type SurveyResponseAnswer = {
  questionId: string;
  /** Question type label, e.g. "Smiley", "Rating", "Yes or No". */
  type?: string;
  /** The raw answer — its shape depends on the question type. */
  response?: unknown;
};

/**
 * A single respondent's submission, as returned by the response endpoints and
 * held in the flow-response store while navigating to the detail screen.
 */
export type SurveyResponseRow = {
  id: string;
  phone?: string;
  createdAt?: string;
  responses?: SurveyResponseAnswer[];
};

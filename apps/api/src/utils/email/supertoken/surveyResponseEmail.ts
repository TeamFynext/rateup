import type { SurveyResponseAnswer } from "../../../emails/survey-response.js";
import { renderSurveyResponseEmail } from "../react/templates.js";

export function createEmailBodySurveyResponse(
  resultsLink: string,
  answers: SurveyResponseAnswer[],
  surveyTitle: string,
) {
  return renderSurveyResponseEmail({ surveyTitle, resultsLink, answers });
}

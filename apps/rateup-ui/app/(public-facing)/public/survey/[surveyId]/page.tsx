import { getPublicSurvey } from "@/backend/surveys/survey.api";

import PublicSurvey from "./publicSurveyC";

// Web Survey
async function WsPublic(props) {
  const params = await props?.params;
  const { surveyId } = params;
  const surveyData = await getPublicSurvey(surveyId);

  return (
    <PublicSurvey
      survey={surveyData}
      error_occured={false}
      fromShortUrl={false}
    />
  );
}

export default WsPublic;

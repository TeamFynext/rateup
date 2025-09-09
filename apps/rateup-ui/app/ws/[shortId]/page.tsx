import { getPublicSurvey } from "../../../backend/surveys/survey.api";
import PublicSurvey from "../../public/survey/[surveyId]/publicSurveyC";

// Web Survey
async function Ws(props) {
  const params = await props?.params;
  const { shortId } = params;
  const surveyData = await getPublicSurvey(shortId);

  return (
    <PublicSurvey survey={surveyData} error_occured={false} fromShortUrl />
  );
}

export default Ws;

import { getPublicSurvey } from "../../../backend/surveys/survey.api";
import PublicSurvey from "../../public/survey/[surveyId]/publicSurveyC";
import ResponseSubmitted from "./response-submitted/page";

// Web Survey
async function Ws(props) {
  const params = await props?.params;
  const { shortId } = params;
  const surveyData = await getPublicSurvey(shortId);

  if (surveyData?.message && surveyData?.message === "ALREADY_SUBMITTED") {
    return <ResponseSubmitted />;
  }

  return (
    <PublicSurvey survey={surveyData} error_occured={false} fromShortUrl />
  );
}

export default Ws;

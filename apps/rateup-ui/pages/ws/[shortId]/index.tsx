import { getPublicSurvey } from "../../../backend/surveys/survey.api";
import PublicSurvey from "../../public/survey/[surveyId]";

type SurveyViewProp = {
  shortId: string;
};

export const getServerSideProps = async (context: {
  params: SurveyViewProp;
}) => {
  try {
    const { shortId } = context.params;
    const surveyData = await getPublicSurvey(shortId);
    return { props: { survey: surveyData } };
  } catch (error) {
    console.error("error in getServerSideProps");
    console.error(error);
    return {
      props: { survey: null, error_occured: true },
    };
  }
};

// Web Survey
function Ws({ survey, error_occured }) {
  return <PublicSurvey survey={survey} error_occured={error_occured} />;
}

export default Ws;

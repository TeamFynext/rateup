import TakeSurvey from "../../../../components/Survey/TakeSurvey/TakeSurveyComponent";
import { TakeSurveyLayoutWeb } from "../../../../components/Layout/TakeSurveyLayout/TakeSurveyLayoutWeb";
import { getPublicSurvey } from "../../../../backend/surveys/survey.api";
import { getPublicwelcomeTheme } from "../../../../backend/WelcomeTheme/welcometheme.api";

type SurveyViewProp = {
  surveyId: string;
};

export const getServerSideProps = async (context: {
  params: SurveyViewProp;
}) => {
  const params = context.params;
  const surveyData = await getPublicSurvey(params.surveyId);
  const surveyThemeData = await getPublicwelcomeTheme(params.surveyId);
  return { props: { survey: surveyData, surveyThemeData: surveyThemeData } };
};

export default function Page({ survey, surveyThemeData }) {
  return (
    <TakeSurveyLayoutWeb survey={survey} surveyThemeData={surveyThemeData}>
      <TakeSurvey />
    </TakeSurveyLayoutWeb>
  );
}

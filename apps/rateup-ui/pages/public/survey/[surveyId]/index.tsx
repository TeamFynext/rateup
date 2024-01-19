import TakeSurvey from "../../../../components/Survey/TakeSurvey/TakeSurveyComponent";
import { TakeSurveyLayoutWeb } from "../../../../components/Layout/TakeSurveyLayout/TakeSurveyLayoutWeb";
import { getPublicSurvey } from "../../../../backend/surveys/survey.api";
import { getPublicwelcomeTheme } from "../../../../backend/WelcomeTheme/welcometheme.api";
import Head from "next/head";

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
    <>
      <Head>
        <title>{`Rateup - Survey ${survey?.title}`}</title>
        <meta name="description" content={`Take survey ${survey?.title}`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Rateup" />
        <meta
          property="og:url"
          content={`https://rateup.app/public/survey/${survey?.id}`}
        />
        <meta
          property="og:title"
          content={`Rateup - Survey ${survey?.title}`}
        />
        <meta
          property="og:description"
          content={`Take survey ${survey?.title}`}
        />
        <meta
          property="og:image"
          content="https://djd7kjh9uwow0.cloudfront.net/images/rateup_logo.png"
        />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1086" />
        <meta property="og:image:height" content="832" />
        <meta property="og:image:alt" content="Star Icon" />
      </Head>
      <TakeSurveyLayoutWeb survey={survey} surveyThemeData={surveyThemeData}>
        <TakeSurvey survey={survey} />
      </TakeSurveyLayoutWeb>
    </>
  );
}

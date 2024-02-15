import TakeSurvey from "../../../../components/Survey/TakeSurvey/TakeSurveyComponent";
import { TakeSurveyLayoutWeb } from "../../../../components/Layout/TakeSurveyLayout/TakeSurveyLayoutWeb";
import { getPublicSurvey } from "../../../../backend/surveys/survey.api";
import Head from "next/head";
import { useEffect, useState } from "react";
import ReviewUsOnGoogle from "./review-us-on-google";

type SurveyViewProp = {
  surveyId: string;
};

export const getServerSideProps = async (context: {
  params: SurveyViewProp;
}) => {
  try {
    const { surveyId } = context.params;
    const surveyData = await getPublicSurvey(surveyId);
    return { props: { survey: surveyData } };
  } catch (error) {
    console.error("error in getServerSideProps");
    console.error(error);
    return {
      props: { survey: null, error_occured: true },
    };
  }
};

export default function Page({ survey, error_occured }) {
  const [isReviewPage, setIsReviewPage] = useState(false);

  useEffect(() => {
    if (error_occured) {
      try {
        const last_error_time = localStorage.getItem("last_error_time");
        localStorage.setItem("last_error_time", Date.now().toString());

        // if past 1 hour then refresh
        if (
          last_error_time &&
          Date.now() - parseInt(last_error_time) > 3600000
        ) {
          localStorage.setItem("number_of_refresh_done", "1");
          window.location.reload();
        } else {
          const number_of_refresh_done = localStorage.getItem(
            "number_of_refresh_done",
          );
          localStorage.setItem(
            "number_of_refresh_done",
            number_of_refresh_done
              ? (parseInt(number_of_refresh_done) + 1).toString()
              : "1",
          );

          if (number_of_refresh_done && parseInt(number_of_refresh_done) > 3) {
            // do nothing
          } else {
            window.location.reload();
          }
        }
      } catch (error) {
        console.error(error);
      }
    }
  }, [error_occured]);

  if (error_occured == true) {
    return <></>;
  }
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
      {isReviewPage ? (
        <ReviewUsOnGoogle
          googleLink={survey.googleLink}
          reviews={survey.reviews}
          orgLogoUrl={
            survey.orgLogo && survey.orgLogo !== "REMOVED_PHOTO"
              ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${survey.orgLogo}`
              : null
          }
        />
      ) : (
        <TakeSurveyLayoutWeb survey={survey}>
          <TakeSurvey survey={survey} setIsReviewPage={setIsReviewPage} />
        </TakeSurveyLayoutWeb>
      )}
    </>
  );
}

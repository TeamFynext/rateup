import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { Button, Image } from "@mantine/core";
import { useTranslations } from "next-intl";

import GoogleReview from "@/components/Survey/TakeSurvey/GoogleReview";

import { getPublicSurvey } from "../../../../backend/surveys/survey.api";
import { usePublicReviewSuggestions } from "../../../../backend/team/reviewSuggestion/reviewSuggestion.query";
import { TakeSurveyLayoutWeb } from "../../../../components/Layout/TakeSurveyLayout/TakeSurveyLayoutWeb";
import TakeSurvey from "../../../../components/Survey/TakeSurvey/TakeSurveyComponent";
import { imagesPath, mimeTypesForImage } from "../../../../utils/constants";
import errorPageStyles from "../../../ws/[shortId]/ws.module.css";
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

export default function Page({ survey, error_occured, fromShortUrl = false }) {
  // empty if its not review page, contains surveyLanguage if its review page
  const [isReviewPage, setIsReviewPage] = useState<string>("");
  const translations = useTranslations();
  const { data: gReview } = usePublicReviewSuggestions(
    !!isReviewPage && !!survey?.surveyTeamMapId,
    survey?.surveyTeamMapId,
    isReviewPage,
  );

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

  if (error_occured) {
    return (
      <div className={errorPageStyles["error-page"]}>
        <Link href="/">
          <Image w={80} src={`${imagesPath}/rateup-logo-blue-text.svg`} />
        </Link>
        <p className={errorPageStyles["error-text"]}>
          {translations("Unable to get survey, please try again later")}
        </p>
        <Button
          className={errorPageStyles["reload-btn"]}
          onClick={() => window.location.reload()}
        >
          {translations("Reload the page")}
        </Button>
      </div>
    );
  }
  const fileExtension =
    survey?.orgLogo?.split(".")?.pop()?.toLowerCase() ?? "png";
  return (
    <>
      <Head>
        <title>{survey?.title}</title>
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Rateup" />
        <meta
          property="og:url"
          content={`https://rateup.app/public/survey/${survey?.id}`}
        />
        <meta property="og:title" content={survey?.title} />
        <meta
          property="og:image"
          content={
            survey.orgLogo
              ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${survey.orgLogo}`
              : "https://djd7kjh9uwow0.cloudfront.net/images/rateup_logo.png"
          }
        />
        <meta
          property="og:image:type"
          content={mimeTypesForImage[fileExtension]}
        />
        <meta property="og:image:width" content="1086" />
        <meta property="og:image:height" content="832" />
        <meta property="og:image:alt" content="Org Icon" />
      </Head>
      {isReviewPage ? (
        <GoogleReview
          orgLogoUrl={survey?.webSurveyTheme?.surveyTheme?.logo?.logo}
          survey={survey}
          surveyTeamMapId={survey?.surveyTeamMapId}
        />
      ) : (
        <TakeSurveyLayoutWeb survey={survey}>
          <TakeSurvey
            survey={survey}
            setIsReviewPage={setIsReviewPage}
            fromShortUrl={fromShortUrl}
          />
        </TakeSurveyLayoutWeb>
      )}
    </>
  );
}

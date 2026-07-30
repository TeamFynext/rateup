import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { TakeSurveyLayoutWeb } from "@/components/Layout/TakeSurveyLayout/TakeSurveyLayoutWeb.tsx";
import GoogleReview from "@/components/Survey/TakeSurvey/GoogleReview/index.tsx";
import TakeSurvey from "@/components/Survey/TakeSurvey/TakeSurveyComponent/index.tsx";
import { Button } from "@/components/ui/button.tsx";
import { rateupLogoStackedWhiteTransparent } from "@/utils/constants.ts";

import errorPageStyles from "../../../ws/$shortId/ws.module.css";

export default function Page({
  survey,
  error_occured,
  fromShortUrl = false,
}: {
  survey: Survey | null;
  error_occured?: boolean;
  fromShortUrl?: boolean;
}) {
  // empty if its not review page, contains surveyLanguage if its review page
  const [isReviewPage, setIsReviewPage] = useState<string>("");
  const { t: translations } = useTranslation();

  useEffect(() => {
    if (error_occured) {
      try {
        const last_error_time = localStorage.getItem("last_error_time");
        localStorage.setItem("last_error_time", Date.now().toString());

        // if past 1 hour then refresh
        if (last_error_time && Date.now() - Number.parseInt(last_error_time) > 3600000) {
          localStorage.setItem("number_of_refresh_done", "1");
          globalThis.window.location.reload();
        } else {
          const number_of_refresh_done = localStorage.getItem("number_of_refresh_done");
          localStorage.setItem(
            "number_of_refresh_done",
            number_of_refresh_done ? (Number.parseInt(number_of_refresh_done) + 1).toString() : "1",
          );

          if (number_of_refresh_done && Number.parseInt(number_of_refresh_done) > 3) {
            // do nothing
          } else {
            globalThis.window.location.reload();
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
        <Link to="/">
          <img
            className="w-[80px] object-contain"
            src={rateupLogoStackedWhiteTransparent}
            alt="RateUp Logo"
          />
        </Link>{" "}
        <p className={errorPageStyles["error-text"]}>
          {translations("Unable to get survey, please try again later")}
        </p>
        <Button
          className={errorPageStyles["reload-btn"]}
          onClick={() => globalThis.window.location.reload()}
        >
          {translations("Reload the page")}
        </Button>
      </div>
    );
  }
  return (
    <>
      {isReviewPage ? (
        <GoogleReview
          orgLogoUrl={survey?.webSurveyTheme?.surveyTheme?.logo?.logo}
          survey={survey}
          surveyTeamMapId={survey?.surveyTeamMapId}
        />
      ) : (
        <TakeSurveyLayoutWeb survey={survey}>
          <TakeSurvey
            survey={survey!}
            setIsReviewPage={setIsReviewPage}
            fromShortUrl={fromShortUrl}
          />
        </TakeSurveyLayoutWeb>
      )}
    </>
  );
}
